defmodule Mutonex.Engine.Entities do
  @moduledoc """
  This module defines the core data structures (structs) for game entities.
  """

  defmodule GameState do
    @moduledoc "Represents the state of the game world to be sent to the client."
    defstruct units: [],
              buildings: [],
              societies: [],
              minerals: [],
              game_time: 0
  end

  defmodule Unit do
    @moduledoc "Represents a mobile entity in the game, such as a player Head, NPC Chief, or follower."
    defstruct id: nil,
              type: nil, # :head, :chief, :follower
              position: %{x: 0, y: 0, z: 0},
              society_id: nil,
              home_id: nil, # building_id
              sight_area: 0,
              attributes: %{
                charm: 0,
                tribe: nil, # :potassium, :helium, etc.
                flavor: nil # :red, :cyan, etc.
              },
              history: %{}
  end

  defmodule Building do
    @moduledoc "Represents a stationary structure built by a society."
    defstruct id: nil,
              type: nil, # :power_structure, :relic, etc.
              position: %{x: 0, y: 0, z: 0},
              society_id: nil,
              chief_id: nil,
              sight_area: 0,
              function: nil, # :resource_conversion, etc.
              history: %{} # {build_year, build_style}
  end

  defmodule Society do
    @moduledoc "Represents a player-controlled or NPC society."
    defstruct id: nil,
              home_id: nil, # building_id of the main power structure
              ethnicity: nil, # :french, etc.
              player_id: nil # nil for NPC societies
  end

  defmodule Fauna do
    @moduledoc "Represents the non-player, non-charmable biosphere of a sector."
    defstruct id: nil,
              sector_id: nil,
              ethnicity: nil # :fauna_french, etc.
  end

  defmodule Mineral do
    @moduledoc "Represents a harvestable resource node."
    defstruct id: nil,
              position: %{x: 0, y: 0, z: 0},
              type: nil # :iron, :potassium, etc.
  end
end
