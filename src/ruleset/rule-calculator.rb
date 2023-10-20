#!/usr/bin/env ruby

# Output
os = ['RULE CALCULATOR']

# Design Doc [chapter] [name]
spec = {
  # DD 4.1.1.
  # • Lidar resolution: the rendering elevation interval, ensure clear visuals.
  :reso_lidar_elev_m => 5,

  # • Entropy-effect probability: signal lost
  # fail % for meeting call & vote, sight & lidar, object-use, directing followers
  :entropy_global_risk_percent => 5,

  # • Movement cost from elevation (unit_v - elev_km * multi)
  :movement_cost_elevation_per_km => 66,

  # DD 4.2.2. Solar Insolation
  :insolation_avg_wsqm => 1000,

  # DD 4.2.3. Orbital Debris Cataclysm
  # Percent of max turns before cataclysm
  :cataclysm_start_turns_percent => 50,

  # DD 4.2.4. Map sectors (10 deg lat/long).
  :sector_grid => 36,

  # DD 4.2.5. Movement cost from latitude
  # cost: reduction multiplier unit_v * (multi * min(0, (deg-tres)))
  :movement_cost_latitude_treshold => 50,
  :movement_cost_latitude_per_degree => 2,

  # DD 4.3.1. Local units
  :units_locals_per_sqkm_min => 1,

  # DD 4.4.1. Buildings
  :building_biosphere_in_kgpd_min => 4,

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
  # • Building/unit limits
  :building_sight_max_r_km => 85
}

# Game instance parameters
Vote = Struct.new(:last_powerstructure_bool,
                  :head_of_chiefs_bool,
                  :fast_mode_bool,
                  :beginner_mode_bool,
                  :turn_per_day_bool)
Ruleset = Struct.new(:turn_mode, :turn_lenght, :session_lenght)
Session = Struct.new(:view, :players, :rule_set, :turn)

# In-game-object mocks
World = Struct.new(:circumference_km, :polar_radius)
Unit = Struct.new(:type, :society, :work_hours, :velocity_kmh)

# Instance mocks
exoplanet = World.new(40000, 6356)

# Mock DD 4.3.2.
head = Unit.new("Head", "Headsociety", 14, 120)

os << "# RESULTS"

os << "DD 4.1.1. - Time-limit/moves required for equatorial sectors"
sectors = spec[:sector_grid]*18
sector_side_km = exoplanet[:circumference_km]/spec[:sector_grid]
sector_visit_min = sectors * limits[:sectors_visited_min]
travel_min_km = sector_side_km * sector_visit_min
travel_time_min_d = travel_min_km / (head[:work_hours] * head[:velocity_kmh])
travel_time_min_turns = (travel_time_min_d/spec[:time_days_per_turn]).to_int
os << "Head-unit time to travel #{sector_visit_min.to_int} of #{sectors} sectors (no elevation/lati multi):"
os << ["In-game #{travel_time_min_d.to_int} days / #{travel_time_min_turns} turns,", "realtime #{(spec[:time_turn_len_s]*travel_time_min_turns)/60} minutes."]

os << "DD 4.1.1. - Polar movement cost, ie. declination"
os << "On a globe, sector physical size decreases proportional to distance from equator. Optimally travel time for every #{360/spec[:sector_grid]} degree sector is similar, explained by harsher environments."
sector_side_polar_km = exoplanet[:polar_radius]/spec[:sector_grid]
os << "Globe sector side in km: #{sector_side_km} equatorial and polar #{sector_side_polar_km}."

os << "DD 4.9. - Temporal Mechanics"
turns_max = spec[:time_max_s]/spec[:time_turn_len_s]
os << "For a #{spec[:time_max_s]/60} minute game, #{turns_max*spec[:time_days_per_turn]} in-world days." 
os << "Maximum number of turns #{turns_max}."

os << "# LIMITS TESTS"
throw "RulesetLimitsError - head-unit travel fails limits[:sectors_visited_min]." unless (travel_time_min_turns < turns_max) 
os << "✓ DD 4.1.1 & DD 4.9 PASS."

#Sanity score
#pseudo game logic to mock resultant gameplay
#f.ex. mock_gameplay(buildingRandomizer)
#      Society.new(players_head, building)

os << "# RULE SCORE"
score_percent = {
  :unit_travel => (turns_max/travel_time_min_turns).floor,
  :req_mem => req_cpu = 20 * 0,
  :rule_sanity => 10 * 0,
  :game_winnable_bool => 20 * 0
}
os << score_percent.values.sum.to_s + " % / 100 %"

# Print results
puts os
