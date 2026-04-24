#!/usr/bin/env ruby

# Output
os = ['RULE CALCULATOR']

# Sector definitions matching Simtellus
SECTOR_SIZE_DEG = 10
LAT_DIVISIONS = (180 / SECTOR_SIZE_DEG).to_i
LON_DIVISIONS = (360 / SECTOR_SIZE_DEG).to_i

# Design Doc [chapter] [name]
spec = {
  # DD 4.1.1.
  # • Lidar resolution: rendering elev interval.
  :reso_lidar_elev_m => 5,

  # • Entropy-effect probability: signal lost
  # fail % for meeting call & vote, sight & lidar,
  # object-use, directing followers
  :entropy_global_risk_percent => 5,

  # • Develop turn based gameplay dynamics
  :turn_based_dynamics_multi => 1.0,

  # • Movement cost from elevation (v - elev*multi)
  :movement_cost_elevation_per_km => 66,

  # DD 4.2.2. Solar Insolation
  :insolation_avg_wsqm => 1000,

  # DD 4.2.3. Orbital Debris Cataclysm
  :cataclysm_start_turns_percent => 50,

  # DD 4.2.4. Map sectors (10 deg lat/long).
  :sector_size_deg => SECTOR_SIZE_DEG,
  :sector_cols_lon => LON_DIVISIONS,
  :sector_rows_lat => LAT_DIVISIONS,

  # DD 4.2.5. Movement cost from latitude
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
  :time_days_per_turn => 17,

  # DD 1.3
  :power_projection_diameter_km => 100,

  # DD 4.3.1. Local units
  :unit_local_velocity_kmh => 80,
  :unit_local_work_hpd => 8,

  # DD 4.3.2. Activist units
  :unit_activist_velocity_kmh => 100,
  :unit_activist_work_hpd => 10,

  # DD 4.3.3. Chief units
  :unit_chief_velocity_kmh => 110,
  :unit_chief_work_hpd => 12,

  # DD 4.3.4. Head units
  :unit_head_velocity_kmh => 120,
  :unit_head_work_hpd => 14,
  :unit_head_sight_r_km => 10,

  # DD 4.3.5. Airpower units
  :unit_airpower_velocity_kmh => 220,
  :unit_airpower_work_hpd => 1,
  :unit_airpower_sight_r_km => 50,

  # DD [New]. Fauna units (Biosphere)
  :unit_fauna_velocity_kmh => 40,
  :unit_fauna_work_hpd => 12
}

limits = {
  # DD 4.1.1. visit 33% of equatorial sectors
  :sectors_visited_min => 0.33,
  # • Building/unit limits
  :building_sight_max_r_km => 85,
  # Sanity check: cross sector in < 10% of game
  :unit_sector_cross_max_turns_percent => 0.1
}

# Game instance parameters
Vote = Struct.new(:last_powerstructure_bool,
                  :head_of_chiefs_bool,
                  :fast_mode_bool,
                  :beginner_mode_bool,
                  :turn_per_day_bool)
Ruleset = Struct.new(:turn_mode, :turn_len, :sess_len)
Session = Struct.new(:view, :players, :rule_set, :turn)

# In-game-object mocks
World = Struct.new(:circumference_km, :polar_radius)
Unit = Struct.new(:type, :society, :work_h, :v_kmh)

# Instance mocks
exoplanet = World.new(40000, 6356)

# Mock DD 4.3.2.
head = Unit.new("Head", "Headsoc", \
                spec[:unit_head_work_hpd], \
                spec[:unit_head_velocity_kmh])

os << "# RESULTS"

os << "DD 4.1.1. - Moves required"
# Using LON_DIVISIONS (36) as ring count
sectors_eq = spec[:sector_cols_lon]
sector_side_km = exoplanet[:circumference_km] / sectors_eq
# Visiting 33% of the equatorial ring
sector_visit_min = sectors_eq * limits[:sectors_visited_min]
travel_min_km = sector_side_km * sector_visit_min
travel_min_d = travel_min_km / (head[:work_h] * head[:v_kmh])
# Use ceil to ensure at least 1 turn if > 0
travel_min_turns = (travel_min_d/spec[:time_days_per_turn]).ceil
os << "Head-unit travel for #{sector_visit_min.to_i} " \
      "of #{sectors_eq} sectors:"
os << ["In-game #{travel_min_d.to_int} d / " \
       "#{travel_min_turns} t,",
       "realtime #{(spec[:time_turn_len_s]*travel_min_turns)/60} " \
       "min."]

os << "DD 4.1.1. - Polar movement cost"
os << "Sector physical size decreases proportional to lat."
sector_polar_km = exoplanet[:polar_radius] / \
                  spec[:sector_cols_lon]
os << "Globe sector side in km: #{sector_side_km.to_i} " \
      "eq and polar #{sector_polar_km.to_i}."

os << "DD 4.9. - Temporal Mechanics"
turns_max = spec[:time_max_s]/spec[:time_turn_len_s]
os << "For a #{spec[:time_max_s]/60} min game, " \
      "#{turns_max*spec[:time_days_per_turn]} in-world " \
      "days."
os << "Maximum number of turns #{turns_max}."

os << "# MOBILITY & PACING CHECKS"
# Calculate sector crossing time for each unit type
units = {
  "Local" => {:v => spec[:unit_local_velocity_kmh], \
              :h => spec[:unit_local_work_hpd]},
  "Activist" => {:v => spec[:unit_activist_velocity_kmh], \
                 :h => spec[:unit_activist_work_hpd]},
  "Chief" => {:v => spec[:unit_chief_velocity_kmh], \
              :h => spec[:unit_chief_work_hpd]},
  "Airpower" => {:v => spec[:unit_airpower_velocity_kmh], \
                 :h => spec[:unit_airpower_work_hpd]},
  "Fauna" => {:v => spec[:unit_fauna_velocity_kmh], \
              :h => spec[:unit_fauna_work_hpd]}
}

mobility_score = 0
units.each do |name, props|
  daily_dist = props[:v] * props[:h]
  days_to_cross = sector_side_km / daily_dist.to_f
  turns_to_cross = (days_to_cross / \
                    spec[:time_days_per_turn]).ceil
  percent_game = (turns_to_cross.to_f / turns_max) * 100

  # Calculate strategic speed (sectors per turn)
  sectors_per_turn = (daily_dist * \
                      spec[:time_days_per_turn]) / \
                     sector_side_km

  os << "#{name} Unit: #{turns_to_cross} turns to cross " \
        "sector (#{percent_game.round(1)}% of game)."

  if sectors_per_turn > 1.0
    os << "  WARNING: #{name} unit crosses >1 sector " \
          "per turn."
  end

  if percent_game < (limits[:unit_sector_cross_max_turns_percent] * 100)
    mobility_score += 25
  end
end

os << "# POWER PROJECTION & ENERGY CHECKS"
# DD 1.3: Power projection
building_h_m = 500 # e.g. tall scraper
projection_r_km = (building_h_m / 10.0) + 50 # Mock formula
target_r_km = spec[:power_projection_diameter_km] / 2.0
os << "Power Projection Radius: #{projection_r_km} km"
projection_score = (projection_r_km >= target_r_km && \
                    projection_r_km <= (target_r_km * 3)) ? 100 : 0

# Energy
solar_area = 100 # m2
energy_kw = (spec[:insolation_avg_wsqm] * \
             solar_area * 0.2) / 1000.0
os << "Energy Harvest: #{energy_kw} kW"
energy_score = energy_kw > 10 ? 100 : 0

os << "# LIMITS TESTS"
# Check if head unit can travel the minimum distance in time
throw "RulesetLimitsError" unless (travel_min_turns < turns_max)
os << "✓ DD 4.1.1 & DD 4.9 PASS."

os << "# RULE SCORE"
score_percent = {
  :unit_travel => (turns_max/travel_min_turns).floor,
  :mobility => mobility_score,
  :power_projection => projection_score,
  :energy => energy_score
}

os << score_percent.values.sum.to_s + " (Arbitrary Score)"

# Print results
puts os
