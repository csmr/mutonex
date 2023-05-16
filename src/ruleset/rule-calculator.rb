#!/usr/bin/env ruby

# Output
os = ['RULE CALCULATOR']

# Design Doc [chapter] [name]
spec = {
  # DD 4.1.
  # • Lidar resolution: the rendering elevation interval, ensure clear visuals.
  :reso_lidar_elev_m => 5,

  # • Movement cost from elevation (unit_v - elev_km * multi)
  :movement_cost_elevation_per_km => 66,

  # DD 4.2.4. Map sectors (10 deg lat/long).
  :sector_grid => 36,

  # DD 4.2.5. Movement cost from latitude
  # cost: reduction multiplier unit_v * (multi * min(0, (deg-tres)))
  :movement_cost_latitude_treshold => 50,
  :movement_cost_latitude_per_degree => 2,

  # DD 4.9.1. 12 minute time limit
  :time_max_s => 720,
  # DD 4.9.2
  :time_turn_len_s => 17,
  # DD 4.9.3
  :time_days_per_turn => 17
}

limits = {
  # DD 4.1.1. able to visit 33% of sectors
  # • Time-limit vs Movement Turns: Number/time of moves for Head unit
  :sectors_visited_min => 0.33,
}

# Game instance parameters
Session = Struct.new(:view, :players, :rule_set, :turn)
Ruleset = Struct.new(:turn_mode, :turn_lenght, :session_lenght)
Vote = Struct.new(:last_powerstructure_bool,
                  :head_of_chiefs_bool,
                  :fast_mode_bool,
                  :beginner_mode_bool,
                  :turn_per_day_bool)

# In-game-object mocks
World = Struct.new(:size, :circumference_km, :polar_radius)
Unit = Struct.new(:type, :society, :work_hours, :velocity_kmh)

# Instance mocks
exoplanet = World.new(160, 40000, 6356)

# DD 4.3.2.
head = Unit.new("Head", nil, 14, 120)

os << "RESULTS"
os << "_"

os << "DD 4.1.1. - Time-limit/moves required for equatorial sectors"
sectors = spec[:sector_grid]*18
sector_side_km = exoplanet[:circumference_km]/spec[:sector_grid]
sector_visit_min = sectors * limits[:sectors_visited_min]
travel_min_km = sector_side_km * sector_visit_min 
travel_time_min_d = travel_min_km / (head[:work_hours] * head[:velocity_kmh])
travel_time_min_turns = (travel_time_min_d/spec[:time_days_per_turn]).to_int
os << "Head-unit time to travel #{sector_visit_min.to_int} of #{sectors} sectors (no elevation/lati multi):"
os << "#{travel_time_min_d.to_int} days, #{travel_time_min_turns} turns, #{(spec[:time_turn_len_s]*travel_time_min_turns)/60} minutes."

os << "DD 4.1.1. - Polar latitudes cost: declination cost"
os << "On a globe, sectors physical size decreases proportional to distance from equator. Optimally travel time for every #{360/spec[:sector_grid]} degree sector is similar, explained by harsher environments."
sector_side_polar_km = exoplanet[:polar_radius]/spec[:sector_grid]
os << "On a globe sector side in km: #{sector_side_km} equatorial and polar #{sector_side_polar_km}"
os << "TODO"
os << "_"

os << "DD 4.9. - Temporal Mechanics"
turns_min = spec[:time_max_s]/spec[:time_turn_len_s]
os << "For a #{spec[:time_max_s]/60} minute game, #{turns_min*spec[:time_days_per_turn]} in-world days." 
os << "Minimum number of turns #{turns_min} for limits."

#pseudo game logic to mock resultant gameplay
#f.ex. mock_gameplay(buildingRandomizer)
#      Society.new(players_head, building)

#ESTIMATE SCORE:
#  Unit travel score
#  memory & cpu req
#  rule sanity score
#  game_winnable

# Print results
puts os

