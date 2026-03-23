defmodule Mutonex.Engine.Systems.FaunaSystem do
  @moduledoc """
  Handles the lifecycle and system logic for Fauna entities,
  including spawning, ticking, and updating the spatial index.
  """

  alias Mutonex.Engine.FaunaBehavior
  alias Mutonex.Engine.SparseOctree
  alias Mutonex.Net.Endpoint

  @doc """
  Spawns initial fauna and populates the Octree.
  Returns `{fauna_map, updated_octree}` and schedules initial ticks.
  """
  def initialize(sector_id, count, octree) do
    fauna_map = FaunaBehavior.spawn(sector_id, count)

    # Populate Octree
    updated_octree = Enum.reduce(fauna_map, octree, fn {_, f}, acc ->
      wrapper = wrap(f)
      SparseOctree.insert(acc, wrapper)
    end)

    # Schedule ticks
    Enum.each(fauna_map, fn {id, _} -> schedule_tick(id) end)

    {fauna_map, updated_octree}
  end

  @doc """
  Processes a single fauna tick.
  Moves the fauna, updates the Octree, broadcasts the update, and schedules the next tick.
  Returns `{new_fauna_map, new_octree}`.
  """
  def process_tick(state, fauna_id) do
    case Map.get(state.fauna, fauna_id) do
      nil ->
        {state.fauna, state.octree}

      f ->
        {f, fauna_map, octree} = case is_stationary?(f) do
          true -> process_stationary(f, state)
          false -> process_mobile(f, state)
        end
        
        schedule_tick(fauna_id)
        {fauna_map, octree}
    end
  end

  defp process_stationary(f, state) do
    case f.status do
      :mummified ->
        # Mummified units don't collect energy or spawn
        {f, state.fauna, state.octree}
        
      _ ->
        # energy collection
        f = accumulate_energy(f, state)
        
        # Check for mummification (for demo, if it exists)
        f = check_vitality(f)
        
        # spawn check (re-attempt size logic)
        {f, spawned} = if f.status == :active, do: check_spawn(f, state), else: {f, nil}
        
        fauna_map = if spawned do
          schedule_tick(spawned.id)
          Map.put(state.fauna, spawned.id, spawned) |> Map.put(f.id, f)
        else
          Map.put(state.fauna, f.id, f)
        end
        
        {f, fauna_map, state.octree}
    end
  end

  defp process_mobile(f, state) do
    case f.status do
      :mummified ->
        {f, state.fauna, state.octree}
        
      _ ->
        # Mobile units consume energy
        f = %{f | energy: f.energy - 0.5}
        f = check_vitality(f)
        
        updated_fauna = if f.status == :active, do: FaunaBehavior.move(f), else: f
        new_fauna_map = Map.put(state.fauna, f.id, updated_fauna)
        
        # Update Octree
        old_wrapper = wrap(f)
        new_wrapper = wrap(updated_fauna)
        new_octree = SparseOctree.update(state.octree, old_wrapper, new_wrapper)
        
        # Broadcast
        broadcast_update(state.sector_id, updated_fauna)
        
        {updated_fauna, new_fauna_map, new_octree}
    end
  end

  defp check_vitality(f) do
    if f.energy <= 0 do
      status = if Map.has_key?(f, :type) and f.type in [:head, :chief, :follower], 
                 do: :mummified, 
                 else: :mummified # Default for fauna
      # For buildings, status should be :ruined. 
      # Since FaunaSystem currently only handles Fauna, :mummified is correct for all f here.
      # If we were handling buildings, we'd check Map.get(f, :__struct__)
      %{f | status: status, energy: 0}
    else
      f
    end
  end

  defp is_stationary?(f), do: String.contains?(f.id, "stationary") || f.charm > 15

  @scales %{
    # Stationary
    "1F331" => 0.4, "1F332" => 5.0, "1F333" => 4.0, "1F334" => 5.0, 
    "1F335" => 1.8, "1F344" => 0.2, "1F33A" => 0.3, "1F33B" => 0.6,
    # Mobile
    "1F404" => 1.7, "1F986" => 0.4, "1F416" => 1.2, "1F98E" => 0.6, 
    "1F40D" => 0.5, "1F427" => 0.7, "1F41C" => 0.15, "1F41D" => 0.15, 
    "1F997" => 0.15, "1F400" => 0.3, "1F402" => 2.2, "1F987" => 0.3, 
    "1F422" => 0.4, "1F994" => 0.4
  }

  @mobile_archetypes [
    "1F404", "1F986", "1F416", "1F98E", "1F40D", "1F427", "1F41C", 
    "1F41D", "1F997", "1F400", "1F402", "1F987", "1F422", "1F994"
  ]

  defp accumulate_energy(f, state) do
    # energy collection relative to size (Watts per turn)
    # Energy/Turn = Scale * SectorWatts
    # Use attribute if present, fallback to map for safety
    size = f.attributes[:scale] || Map.get(@scales, f.society, 1.0)
    watts = Map.get(state, :sector_energy, 200.0)
    
    %{f | energy: f.energy + (size * watts)}
  end

  defp check_spawn(f, state) do
    # Requires unit_scale * 10,000 W to spawn
    # Limited by parent's energy, not specifically the parent's scale
    archetype = Enum.random(@mobile_archetypes)
    unit_scale = Map.get(@scales, archetype, 1.0)
    cost = unit_scale * 10_000.0
    
    if f.energy >= cost do
      # Since we already have the archetype, pass it to attempt_spawn or handle here
      spawned = %Mutonex.Engine.Entities.Fauna{
        id: "fauna_spawned_#{System.unique_integer([:positive])}",
        sector_id: state.sector_id,
        position: %{x: f.position.x, y: f.position.y, z: f.position.z}, # Near parent
        society: archetype,
        energy: unit_scale * 1000.0, # Start with some energy
        status: :active,
        attributes: %{
          scale: unit_scale
        }
      }
      {%{f | energy: f.energy - cost}, spawned}
    else
      {f, nil}
    end
  end

  defp attempt_spawn(max_size, sid) do
    # Re-attempt spawn until unit size <= stationary size
    # Max 5 attempts to avoid infinite loops
    do_attempt_spawn(max_size, sid, 5)
  end

  defp do_attempt_spawn(_max_size, _sid, 0), do: nil
  defp do_attempt_spawn(max_size, sid, retries) do
    archetype = Enum.random(@mobile_archetypes)
    unit_size = Map.get(@scales, archetype, 1.0)
    
    if unit_size <= max_size do
      # Successful spawn
      %Mutonex.Engine.Entities.Fauna{
        id: "fauna_spawned_#{System.unique_integer([:positive])}",
        sector_id: sid,
        position: %{x: 0, y: 0, z: 0}, # Placeholder, would be near parent
        society: archetype, # Use glyph key
        charm: 0
      }
    else
      do_attempt_spawn(max_size, sid, retries - 1)
    end
  end

  defp is_stationary?(f), do: String.contains?(f.id, "stationary") || f.charm > 15

  defp wrap(fauna) do
    %{
      x: fauna.position.x,
      y: fauna.position.y,
      z: fauna.position.z,
      id: fauna.id,
      type: :fauna
    }
  end

  defp schedule_tick(fauna_id) do
    Process.send_after(self(), {:tick_fauna, fauna_id}, FaunaBehavior.tick_delay())
  end

  defp broadcast_update(sector_id, fauna) do
    # Format as list of lists for client [id, x, y, z]
    fauna_list = [[fauna.id, fauna.position.x, fauna.position.y, fauna.position.z]]
    Endpoint.broadcast("game:" <> sector_id, "fauna_update", %{fauna: fauna_list})
  end
end
