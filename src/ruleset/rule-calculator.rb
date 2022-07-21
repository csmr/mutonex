#!/usr/bin/env ruby

# RULE CALCULATOR

# Design Doc chapter parameters
limits = {
  # • Time-limit vs Movement Turns: Number/time of moves required to visit of 33% of Sectors
  # DD 4.9.1. 12 minute time limit
  :time_max_seconds => 720,
  # DD 4.1.1. able to visit 33% of sectors
  :sectors_visited_min => 0.33,

  # • Sector size: the game board size, the world grid resolution.
  # DD 3.2.2. 40x40 game board
  :sector_grid_default => 40
}

defaults = {
  # DD 4.1.
  # • Movement cost: negative multiplier from elevation (unit_v - elev_km * multi)
  :movement_elevation_multiplier_per_km => 66,

  # • Polar latitude cost: reduction multiplier (unit_v * multi * min(0, (deg-tres)))
  :movement_reduction_latitude_treshold => 60,
  :movement_reduction_latitude_per_degree => 2,

  # • Lidar resolution: the rendering elevation interval, and polygonal resolution, to ensure clear visuals.
  :reso_lidar_elev_m => 5
}

# Game instance parameters
Session = Struct.new(:view, :players, :rule_set, :turn)
Ruleset = Struct.new(:turn_mode, :turn_lenght, :session_lenght)
Vote = Struct.new(:last_powerstructure_bool, :head_of_chiefs_bool, :fast_mode_bool, :beginner_mode_bool, :turn_per_day_bool)

# In-game-object mocks
World = Struct.new(:size, :equatorial_circumference_km)
Unit = Struct.new(:type, :society, :work_hours, :maximum_velocity)

# Instance mocks
world_small = World.new(40, 10000)
world_medium = World.new(160, 40000)
world_large = World.new(640, 120000)

# DD 4.3.
players_head = Unit.new("Head", nil, 8, 140)

#pseudo game logic to mock resultant gameplay
#f.ex. mock_gameplay(buildingRandomizer)
#      Society.new(players_head, building)
#      ...

#ESTIMATE SCORE:
#  optimal sector size (game world resolution)
#  - minimum time/move limit required for World @ Sector size
#  memory & cpu req
#  rule sanity score

#  game_winnable

