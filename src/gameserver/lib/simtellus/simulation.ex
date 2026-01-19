defmodule Mutonex.Simtellus.Simulation do
  use GenServer
  require Logger
  alias Mutonex.Simtellus.Planet

  @sector_size 10
  @lat_divisions div(180, @sector_size)
  @lon_divisions div(360, @sector_size)
  @default_years_before 100
  # Default start date: 2088-01-01
  @default_start_date ~D[2088-01-01]

  defmodule State do
    defstruct [:sector_states, :artifacts, :current_date, :start_date, :ready]
  end

  # Client API

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def get_state(lat, lon) do
    GenServer.call(__MODULE__, {:get_state, lat, lon})
  end

  def get_artifacts(lat, lon) do
    GenServer.call(__MODULE__, {:get_artifacts, lat, lon})
  end

  def add_artifact(lat, lon, artifact) do
    GenServer.cast(__MODULE__, {:add_artifact, lat, lon, artifact})
  end

  def current_date() do
    GenServer.call(__MODULE__, :current_date)
  end

  # Debug/Test helper
  def advance_date() do
    GenServer.call(__MODULE__, :advance_date)
  end

  # GenServer Callbacks

  @impl true
  def init(opts) do
    start_date = Keyword.get(opts, :start_date, @default_start_date)
    years_before = Keyword.get(opts, :years_before, @default_years_before)

    state = %State{
      sector_states: %{},
      artifacts: %{},
      current_date: start_date,
      start_date: start_date,
      ready: false
    }

    {:ok, state, {:continue, {:init_simulation, years_before}}}
  end

  @impl true
  def handle_continue({:init_simulation, years_before}, state) do
    Logger.info("Initializing Simtellus simulation with #{years_before} years of history...")

    # Initialize default values
    initial_sector_states =
      for lat_index <- (-@lat_divisions)..(@lat_divisions),
          lon_index <- 0..(@lon_divisions),
          into: %{} do
        lat = lat_index * @sector_size
        lon = lon_index * @sector_size
        key = sector_key(lat, lon)
        {key, %{energy: 0, temperature: 15.0, rainfall: 0, historical_min_temp: 15.0, historical_max_temp: 15.0}}
      end

    state = %{state | sector_states: initial_sector_states}

    # Run history
    state = run_history(state, years_before)

    Logger.info("Simtellus simulation initialized.")
    {:noreply, %{state | ready: true}}
  end

  @impl true
  def handle_call({:get_state, lat, lon}, _from, state) do
    if state.ready do
      key = sector_key(lat, lon)
      val = Map.get(state.sector_states, key)
      {:reply, {:ok, val}, state}
    else
      {:reply, {:error, :not_ready}, state}
    end
  end

  @impl true
  def handle_call({:get_artifacts, lat, lon}, _from, state) do
    key = sector_key(lat, lon)
    {:reply, Map.get(state.artifacts, key, []), state}
  end

  @impl true
  def handle_call(:current_date, _from, state) do
    {:reply, state.current_date, state}
  end

  @impl true
  def handle_call(:advance_date, _from, state) do
    new_state = advance_simulation_day(state)
    {:reply, new_state.current_date, new_state}
  end

  @impl true
  def handle_cast({:add_artifact, lat, lon, artifact}, state) do
    key = sector_key(lat, lon)
    new_artifacts = Map.update(state.artifacts, key, [artifact], fn existing -> existing ++ [artifact] end)
    {:noreply, %{state | artifacts: new_artifacts}}
  end

  @impl true
  def handle_info(:tick_simulation, state) do
    new_state = advance_simulation_day(state)
    {:noreply, new_state}
  end

  # Private Functions

  defp sector_key(lat, lon) do
    lat_index = floor(lat / @sector_size)
    lon_index = floor(lon / @sector_size)
    "#{lat_index}_#{lon_index}"
  end

  defp run_history(state, years_before) do
    Enum.reduce(1..years_before, state, fn year, acc_state ->
      past_date = Date.add(acc_state.start_date, -year * 365)
      update_simulation_for_date(acc_state, past_date)
    end)
  end

  defp advance_simulation_day(state) do
    new_date = Date.add(state.current_date, 1)
    state = update_simulation_for_date(state, new_date)
    %{state | current_date: new_date}
  end

  defp update_simulation_for_date(state, date) do
    yearday = Date.day_of_year(date)

    new_sector_states =
      Map.new(state.sector_states, fn {key, current_sector_state} ->
        # We need to extract lat/lon from key or store it.
        # Storing it is expensive? calculating from key is easy.
        [lat_idx_s, _lon_idx_s] = String.split(key, "_")
        lat = String.to_integer(lat_idx_s) * @sector_size
        # lon = String.to_integer(lon_idx_s) * @sector_size # Unused but good for ref

        new_energy = Planet.irradiance_daily_wm2(lat, yearday)
        new_temp = Planet.temp(yearday, lat, 0, 0)
        new_rainfall = 5.0 # Mock

        historical_min = min(current_sector_state.historical_min_temp || new_temp, new_temp)
        historical_max = max(current_sector_state.historical_max_temp || new_temp, new_temp)

        new_val = %{
          energy: new_energy,
          temperature: new_temp,
          rainfall: new_rainfall,
          historical_min_temp: historical_min,
          historical_max_temp: historical_max
        }
        {key, new_val}
      end)

    %{state | sector_states: new_sector_states}
  end
end
