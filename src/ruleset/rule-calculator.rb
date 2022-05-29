#!/usr/bin/env ruby

# RULE CALCULATOR
# • Sector size: the game board size, the world grid resolution.
# - constraints for World size through Sector size.
# • Time-limit vs Movement Turns: Number/time of moves required to visit of 33% of Sectors – ensure it is possible to complete average game within time limit.
# - minimum time/move limit required for World @ Sector size
# • Lidar resolution: the rendering elevation interval, and polygonal resolution, to ensure clear visuals.
# • Movement cost: negative multiplier from elevation and terrain (ie. mountains limit movement).
# • Polar latitude cost: negative multiplier from declination (ant/arctic is hard).

# Game parameters ideas
Session = Struct.new(:view, :players, :rule_set, :turn)
Ruleset = Struct.new(:turn_mode, :turn_lenght, :session_lenght)
Vote = Struct.new(:last_powerstructure_bool, :head_of_chiefs_bool, :fast_mode_bool, :beginner_mode_bool, :turn_per_day_bool)

# In-game-object mock ideas
Simulation = Struct.new(:addr, :apiprofile)
World = Struct.new(:size, :equatorial_circumference_km)
Society = Struct.new(:name)
Unit = Struct.new(:type, :society, :maximum_velocity)
Head = Struct.new(:society, :followers, :maximum_velocity_kmh)

#MOCK GAME
#world_one = World.new(40, 40000);
#players_head = Head.new("John", nil, 140)
#...
#pseudo game logic to mock resultant gameplay
#f.ex. mock_gameplay(buildingRandomizer)
#      Society.new(players_head, building)
#      ...

#ESTIMATE SCORE:
#  optimal sector size (game world resolution)
#  memory & cpu req
#  rule sanity score
#  game_winnable