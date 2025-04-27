defmodule Engine.GameInstance do
  defstruct [:sector_id, :players, :scene_graph]

  def new(sector_id) do
    bounds = {0, 0, 0, 100, 100, 100} # TODO should be degrees?
    %Engine.GameInstance{
      sector_id: sector_id,
      players: %{},
      scene_graph: SparseOctree.new(bounds)
    }
  end

  def handle_move(instance, user_id, payload) do
    # Update player position in the scene graph
    entity = %{id: user_id, x: payload["x"], y: payload["y"], z: payload["z"]}
    updated_scene_graph = SparseOctree.insert(instance.scene_graph, entity)
    %{instance | scene_graph: updated_scene_graph}
  end
end

