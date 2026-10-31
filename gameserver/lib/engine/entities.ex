defmodule Mutonex.Engine.Entities do
  @moduledoc """
  Core data structures (structs) for Mutonex game entities.
  """

  defmodule Player do
    @moduledoc "Represents a player avatar in the game world."
    @derive Jason.Encoder
    defstruct id: nil,
              position: %{x: 0, y: 0, z: 0}
  end

  defmodule Terrain do
    @moduledoc "Represents the terrain of a game sector."
    @derive Jason.Encoder
    defstruct type: :heightmap,
              size: %{width: 0, height: 0},
              data: []
  end

  defmodule GameState do
    @moduledoc "State of the game world broadcast to clients."
    @derive Jason.Encoder
    defstruct players: [],
              terrain: %Mutonex.Engine.Entities.Terrain{},
              fauna: [],
              minerals: [],
              conveyors: [],
              buildings: [],
              items: [],
              game_time: 0
  end

  defmodule Unit do
    @moduledoc "Represents a mobile entity (Head, Chief, Follower)."
    @derive Jason.Encoder
    defstruct id: nil,
              type: nil,
              position: %{x: 0, y: 0, z: 0},
              society_id: nil,
              home_id: nil,
              birthplace: nil,
              sight_area: 0,
              sight_radius: 10.0,
              movement_speed: 80.0,
              is_charmable: true,
              attributes: %{
                charm: 1,
                tribe: nil,
                flavor: nil,
                scale: 1.0
              },
              inventory: [],
              energy: 100.0,
              status: :active,
              history: %{},
              invalid_token_count: 0,
              expired_token_count: 0
  end

  defmodule Building do
    @moduledoc "Represents a stationary society structure."
    @derive Jason.Encoder
    defstruct id: nil,
              type: nil,
              position: %{x: 0, y: 0, z: 0},
              society_id: nil,
              chief_id: nil,
              sight_area: 0,
              perimeter_radius: 2.0,
              function: nil,
              connected_mineral_ids: [],
              attributes: %{
                element: nil,
                ethnicity: nil,
                scale: 1.0
              },
              energy: 0,
              status: :active,
              history: %{}
  end

  defmodule Society do
    @moduledoc "Represents a player-controlled or NPC society."
    @derive Jason.Encoder
    defstruct id: nil,
              home_id: nil,
              locale: nil,
              player_id: nil
  end

  defmodule Fauna do
    @moduledoc "Represents the non-player biosphere of a sector."
    @derive Jason.Encoder
    defstruct id: nil,
              sector_id: nil,
              position: %{x: 0, y: 0, z: 0},
              society: nil,
              charm: 0,
              is_charmable: false,
              attributes: %{
                scale: 1.0
              },
              energy: 0,
              status: :active,
              last_spawn_time: 0
  end

  defmodule Mineral do
    @moduledoc "Represents a harvestable resource node."
    @derive Jason.Encoder
    defstruct id: nil,
              position: %{x: 0, y: 0, z: 0},
              type: nil,
              amount: 1000,
              size: 2.0
  end

  defmodule ConveyorBelt do
    @moduledoc "Conveyor belt connecting mineral to building."
    @derive Jason.Encoder
    defstruct id: nil,
              mineral_id: nil,
              building_id: nil,
              status: :building
  end

  defmodule Item do
    @moduledoc "Represents a pickable item in the game world."
    @derive Jason.Encoder
    defstruct id: nil,
              type: nil,
              position: %{x: 0, y: 0, z: 0},
              metadata: %{}
  end
end
