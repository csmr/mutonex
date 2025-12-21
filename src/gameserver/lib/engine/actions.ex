defmodule Mutonex.Engine.Actions do
  @moduledoc """
  Handles unit actions such as building structures or modifying the world.
  """
  alias Mutonex.Engine.Entities.ConveyorBelt

  @doc """
  Attempts to build a conveyor belt connecting a mineral to a building.

  ## Parameters
  - `game_state`: The current `GameState` struct (or a map containing necessary lists).
  - `unit`: The `Unit` struct performing the action.
  - `mineral`: The `Mineral` struct to connect.
  - `building`: The `Building` struct to connect to.

  ## Returns
  - `{:ok, new_conveyor, updated_building}` if successful.
  - `{:error, reason}` if validation fails.
  """
  def build_conveyor(game_state, unit, mineral, building) do
    with :ok <- validate_distance(unit, mineral),
         :ok <- validate_mineral_availability(game_state, mineral.id) do

      # Create new conveyor
      new_conveyor = %ConveyorBelt{
        id: "conveyor_#{mineral.id}_#{building.id}",
        mineral_id: mineral.id,
        building_id: building.id,
        status: :building
      }

      # Update building
      updated_building = %{building | connected_mineral_ids: [mineral.id | building.connected_mineral_ids]}

      # Update GameState
      # We need to replace the old building in the list (if it's a list) or map.
      # Assuming game_state has lists for simplicity based on previous context,
      # but ideally these are Maps in GameSession state.
      # The GameState struct passed here might be the struct (lists) or the internal state (maps).
      # Let's assume for this pure function it operates on lists as seen in `GameState` struct.
      # NOTE: For efficiency, GameSession uses maps. This function should probably accept
      # the internal state map structure or be adaptable.
      # Let's assume it receives the internal state maps for `minerals`, `conveyors`, `buildings`?
      # Wait, GameSession state has `players`, `fauna`, `minerals`, `conveyors` (added recently).
      # It doesn't seem to have a `buildings` map yet explicitly in the `GameSession` init I saw.
      # It has `players`, `terrain`, `fauna`.
      # I should probably update GameSession to track buildings too if I want to update them.
      # For now, I will assume the `building` passed is the object, and I return the updated building
      # and the new conveyor, let the caller handle state persistence.

      {:ok, new_conveyor, updated_building}
    else
      error -> error
    end
  end

  defp validate_distance(unit, target) do
    dist = distance(unit.position, target.position)
    if dist <= 1.0 do # 1 km range
      :ok
    else
      {:error, :too_far}
    end
  end

  defp validate_mineral_availability(game_state, mineral_id) do
    # Check if any conveyor already connects this mineral
    # game_state.conveyors is a list or map.
    conveyors = game_state.conveyors

    is_connected = Enum.any?(conveyors, fn c ->
      # Handle if c is a struct or {id, struct} tuple depending on state format
      case c do
        %ConveyorBelt{mineral_id: ^mineral_id} -> true
        {_, %ConveyorBelt{mineral_id: ^mineral_id}} -> true
        _ -> false
      end
    end)

    if is_connected do
      {:error, :mineral_already_connected}
    else
      :ok
    end
  end

  defp distance(p1, p2) do
    dx = p1.x - p2.x
    dy = p1.y - p2.y
    dz = p1.z - p2.z
    :math.sqrt(dx*dx + dy*dy + dz*dz)
  end
end
