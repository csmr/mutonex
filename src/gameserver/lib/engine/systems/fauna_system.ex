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

      current_fauna ->
        updated_fauna = FaunaBehavior.move(current_fauna)
        new_fauna_map = Map.put(state.fauna, fauna_id, updated_fauna)

        # Update Octree
        old_wrapper = wrap(current_fauna)
        new_wrapper = wrap(updated_fauna)
        new_octree = SparseOctree.update(state.octree, old_wrapper, new_wrapper)

        # Broadcast and Schedule
        broadcast_update(state.sector_id, updated_fauna)
        schedule_tick(fauna_id)

        {new_fauna_map, new_octree}
    end
  end

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
