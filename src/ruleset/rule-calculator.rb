#!/usr/bin/env ruby

# RULE CALCULATOR

# Design Doc chapter parameters
limits = {
  # • Time-limit vs Movement Turns: Number/time of moves required to visit of 33% of Sectors
  # DD 4.9.1. 12 minute time limit
  :time_max_seconds => 720,
  # DD 4.1.1. 33% of sectors
  :sectors_visited_min => 0.33,

  # • Sector size: the game board size, the world grid resolution.
  # DD 3.2.2. 40x40 game board
  :default_sector_grid => 40

  # - minimum time/move limit required for World @ Sector size

  # • Lidar resolution: the rendering elevation interval, and polygonal resolution, to ensure clear visuals.
  # • Movement cost: negative multiplier from elevation and terrain (ie. mountains limit movement).
  # • Polar latitude cost: negative multiplier from declination (ant/arctic is hard).
}

# Game instance parameters
Session = Struct.new(:view, :players, :rule_set, :turn)
Ruleset = Struct.new(:turn_mode, :turn_lenght, :session_lenght)
Vote = Struct.new(:last_powerstructure_bool, :head_of_chiefs_bool, :fast_mode_bool, :beginner_mode_bool, :turn_per_day_bool)

# In-game-object mocks
World = Struct.new(:size, :equatorial_circumference_km)
Unit = Struct.new(:type, :society, :maximum_velocity)

# Instance mocks
world_small = World.new(40, 10000);
world_medium = World.new(160, 40000);
world_large = World.new(640, 120000);

players_head = Unit.new("Head", nil, 140)

#pseudo game logic to mock resultant gameplay
#f.ex. mock_gameplay(buildingRandomizer)
#      Society.new(players_head, building)
#      ...

#ESTIMATE SCORE:
#  optimal sector size (game world resolution)
#  memory & cpu req
#  rule sanity score

#  game_winnable

