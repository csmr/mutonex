defmodule Mutonex.Simtellus.Simulation do
  use GenServer
  require Logger
  alias Mutonex.Simtellus.Planet
  alias Mutonex.Utils.ConfigReader

  defmodule State do
    defstruct [
      :sector_states,
      :artifacts,
      :current_date,
      :start_date,
      :ready,
      :sector_size
    ]
  end

  # --- Client API ---

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def get_state(lat, lon) do
    GenServer.call(__MODULE__, {:get_state, lat, lon})
  end

  def get_artifacts(lat, lon) do
    GenServer.call(__MODULE__, {:get_artifacts, lat, lon})
  end

  def add_artifact(lat, lon, art) do
    msg = {:add_artifact, lat, lon, art}
    GenServer.cast(__MODULE__, msg)
  end

  def current_date do
    GenServer.call(__MODULE__, :current_date)
  end

  def advance_date do
    GenServer.call(__MODULE__, :advance_date)
  end

  # --- GenServer Callbacks ---

  @impl true
  def init(opts) do
    cfg = ConfigReader.get(__MODULE__)
    sd = Keyword.get(opts, :start_date, cfg[:default_start_date])
    yb = Keyword.get(opts, :years_before, cfg[:default_years_before])
    sz = cfg[:sector_size] || 10

    state = %State{
      sector_states: %{},
      artifacts: %{},
      current_date: sd,
      start_date: sd,
      ready: false,
      sector_size: sz
    }

    {:ok, state, {:continue, {:init_simulation, yb}}}
  end

  @impl true
  def handle_continue({:init_simulation, years}, state) do
    sz = state.sector_size
    l_divs = div(180, sz)
    o_divs = div(360, sz)

    Logger.info("Initializing Simtellus simulation...")

    states =
      for lat_idx <- (-l_divs)..l_divs,
          lon_idx <- 0..o_divs,
          into: %{} do
        key = {lat_idx * sz, lon_idx * sz}
        {key, initial_sector_state()}
      end

    acc = %{state | sector_states: states}
    state = run_history(acc, years)
    Logger.info("Simtellus simulation initialized.")
    {:noreply, %{state | ready: true}}
  end

  defp initial_sector_state do
    %{
      energy: 0,
      temperature: 15.0,
      rainfall: 0,
      historical_min_temp: 15.0,
      historical_max_temp: 15.0
    }
  end

  @impl true
  def handle_call({:get_state, lat, lon}, _from, state) do
    key = sector_key(lat, lon, state.sector_size)
    val = Map.get(state.sector_states, key)

    case state.ready do
      true -> {:reply, {:ok, val}, state}
      false -> {:reply, {:error, :not_ready}, state}
    end
  end

  @impl true
  def handle_call({:get_artifacts, la, lo}, _from, state) do
    key = sector_key(la, lo, state.sector_size)
    val = Map.get(state.artifacts, key, [])
    {:reply, val, state}
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
  def handle_cast({:add_artifact, lat, lon, art}, state) do
    key = sector_key(lat, lon, state.sector_size)

    new_arts =
      Map.update(state.artifacts, key, [art], fn existing ->
        existing ++ [art]
      end)

    {:noreply, %{state | artifacts: new_arts}}
  end

  @impl true
  def handle_info(:tick_simulation, state) do
    {:noreply, advance_simulation_day(state)}
  end

  # --- Private Functions ---

  defp sector_key(lat, lon, sz) do
    lat = max(-90, min(90, lat))
    lon = if lon < 0, do: lon + 360, else: lon
    lon = lon - 360 * floor(lon / 360)

    l_base = floor(lat / sz) * sz
    o_base = floor(lon / sz) * sz
    {l_base, o_base}
  end

  defp run_history(state, years) do
    Enum.reduce(1..years, state, fn year, acc ->
      date = Date.add(acc.start_date, -year * 365)
      update_simulation_for_date(acc, date)
    end)
  end

  defp advance_simulation_day(state) do
    new_date = Date.add(state.current_date, 1)
    state = update_simulation_for_date(state, new_date)
    %{state | current_date: new_date}
  end

  defp update_simulation_for_date(state, date) do
    yearday = Date.day_of_year(date)

    new_states =
      Map.new(state.sector_states, fn {key, cur} ->
        val = calculate_sector_update(key, cur, yearday)
        {key, val}
      end)

    %{state | sector_states: new_states}
  end

  defp calculate_sector_update({lat, _lon}, cur, yearday) do
    new_e = Planet.irradiance_daily_wm2(lat, yearday)
    new_t = Planet.temp(yearday, lat, 0, 0)
    new_r = 5.0
    h_min = min(cur.historical_min_temp || new_t, new_t)
    h_max = max(cur.historical_max_temp || new_t, new_t)

    %{
      energy: new_e,
      temperature: new_t,
      rainfall: new_r,
      historical_min_temp: h_min,
      historical_max_temp: h_max
    }
  end
end
