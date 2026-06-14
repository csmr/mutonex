import Config

config :mutonex_server, Mutonex.Engine.GameLoop,
  turn_interval_ms: 20_000,
  active_sectors: [
    %{lat: 0, lon: 0},
    %{lat: 51.5, lon: -0.12}, # London
    %{lat: 35.6, lon: 139.6}  # Tokyo
  ]

config :mutonex_server, Mutonex.Engine.GameSession,
  # Max speed: ~8 km/h (2.22 m/s)
  max_speed_ms: 2.22,
  # Sector turn is ~17s per GDD, but for testing we use faster rate
  sector_tick_ms: 5000,
  token_rotation_ms: 10_000,
  # Energy/Turn = Scale * SectorWatts - Maintenance
  building_maintenance_cost: 3.0,
  # Deplete energy per tick (mobile)
  player_energy_depletion: 0.5,
  default_spawn_position: %{x: 0, y: 1, z: 0}

config :mutonex_server, Mutonex.Engine.Systems.Environment,
  # Start time in minutes (12:00)
  game_time: 720,
  # Global solar energy constant (Watts per m2)
  sector_energy: 200.0,
  terrain_size: {20, 20},
  mineral_spawn: {5, %{x: 20, z: 20}},
  fauna_spawn: 22,
  test_layout: %{
    # Archetype positions for test sector
    unit_z: 40,
    spawn_hub_z: 45,
    item_z: -40,
    building_z: 0,
    # Scales for specific test buildings
    spawn_hub_scale: 10.0,
    building_scales: %{
      power_structure: 10.0,
      cityscape: 4.0,
      moyai: 3.0,
      solar_panel: 5.0,
      houses: 1.5,
      tent: 0.8
    }
  }

config :mutonex_server, Mutonex.Engine.FaunaBehavior,
  # Movement ranges (km)
  jitter_range: 0.14,
  wander_range: 1.0,
  # Tick delay (ms): random(random) + base
  tick_delay_base: 2000,
  tick_delay_random: 8000

config :mutonex_server, Mutonex.Engine.Systems.FaunaSystem,
  stationary_charm_threshold: 15,
  # Requires unit_scale * multiplier W to spawn
  spawn_cost_multiplier: 10_000.0,
  spawn_initial_energy_multiplier: 1000.0,
  mobile_energy_consumption: 0.5,
  scales: %{
    # Stationary
    "1F331" => 0.4,
    "1F332" => 5.0,
    "1F333" => 4.0,
    "1F334" => 5.0,
    "1F335" => 1.8,
    "1F344" => 0.2,
    "1F33A" => 0.3,
    "1F33B" => 0.6,
    # Mobile
    "1F404" => 1.7,
    "1F986" => 0.4,
    "1F416" => 1.2,
    "1F98E" => 0.6,
    "1F40D" => 0.5,
    "1F427" => 0.7,
    "1F41C" => 0.15,
    "1F41D" => 0.15,
    "1F997" => 0.15,
    "1F400" => 0.3,
    "1F402" => 2.2,
    "1F987" => 0.3,
    "1F422" => 0.4,
    "1F994" => 0.4
  },
  mobile_archetypes: [
    "1F404",
    "1F986",
    "1F416",
    "1F98E",
    "1F40D",
    "1F427",
    "1F41C",
    "1F41D",
    "1F997",
    "1F400",
    "1F402",
    "1F987",
    "1F422",
    "1F994"
  ]
