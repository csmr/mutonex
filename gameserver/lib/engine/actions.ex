defmodule Mutonex.Engine.Actions do
  @moduledoc """
  Handles unit actions such as building structures or modifying
  the world.
  """
  alias Mutonex.Engine.Entities.{Building, ConveyorBelt}

  @doc "Builds a conveyor connecting mineral to building."
  def build_conveyor(game_state, unit, mineral, building) do
    with :ok <- validate_distance(unit, mineral),
         :ok <- validate_min_avail(game_state, mineral.id) do
      c = %ConveyorBelt{
        id: "conveyor_#{mineral.id}_#{building.id}",
        mineral_id: mineral.id,
        building_id: building.id,
        status: :building
      }
      mids = [mineral.id | building.connected_mineral_ids]
      upd_bld = %{building | connected_mineral_ids: mids}
      {:ok, c, upd_bld}
    end
  end

  @doc "Builds a power structure with 100km sight radius."
  def build_powerstructure(unit, target_pos, existing_blds) do
    with :ok <- validate_build_dist(unit.position, target_pos),
         :ok <- validate_perimeter(existing_blds, target_pos) do
      uid = System.unique_integer([:positive])
      b = %Building{
        id: "power_structure_#{uid}",
        type: :power_structure,
        position: target_pos,
        society_id: unit.society_id,
        sight_area: 100.0,
        perimeter_radius: 2.0,
        energy: 100.0,
        status: :active,
        attributes: %{scale: 1.0}
      }
      {:ok, b}
    end
  end

  @doc "Builds a fiber optic network infrastructure."
  def build_fiber(unit, target_pos) do
    with :ok <- validate_build_dist(unit.position, target_pos) do
      uid = System.unique_integer([:positive])
      b = %Building{
        id: "fiber_optic_#{uid}",
        type: :fiber_optic,
        position: target_pos,
        society_id: unit.society_id,
        energy: 100.0,
        status: :active,
        attributes: %{scale: 1.0}
      }
      {:ok, b}
    end
  end

  defp validate_distance(unit, target) do
    if distance(unit.position, target.position) <= 15.0 do
      :ok
    else
      {:error, :too_far}
    end
  end

  defp validate_build_dist(pos1, pos2) do
    if distance(pos1, pos2) <= 15.0 do
      :ok
    else
      {:error, :too_far}
    end
  end

  defp validate_perimeter(existing_blds, pos) do
    alias Mutonex.Engine.Systems.Environment
    if Environment.valid_building_perimeter?(
         existing_blds,
         pos,
         :power_structure
       ) do
      :ok
    else
      {:error, :perimeter_violation}
    end
  end

  defp validate_min_avail(game_state, mineral_id) do
    conveyors = game_state.conveyors || []
    conn = Enum.any?(conveyors, &is_connected?(&1, mineral_id))
    if conn, do: {:error, :mineral_already_connected}, else: :ok
  end

  defp is_connected?(%ConveyorBelt{mineral_id: mid}, target_id) do
    mid == target_id
  end

  defp is_connected?({_, %ConveyorBelt{mineral_id: mid}}, target_id) do
    mid == target_id
  end

  defp is_connected?(_, _), do: false

  defp distance(p1, p2) do
    dx = p1.x - p2.x
    dy = p1.y - p2.y
    dz = p1.z - p2.z
    :math.sqrt(dx * dx + dy * dy + dz * dz)
  end
end
