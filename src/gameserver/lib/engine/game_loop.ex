defmodule Engine.GameLoop do
  use GenServer
  require Logger

  # Turn interval in milliseconds. Defaulting to 20 seconds.
  @turn_interval_ms 20 * 1000

  #
  # Client API
  #

  @doc """
  Starts the game loop GenServer. It's named globally via the module name.
  """
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  #
  # GenServer Callbacks
  #

  @impl true
  def init(_opts) do
    # For now, we'll use a hardcoded list of sectors.
    # In a real app, this would be managed dynamically.
    active_sectors = [
      %{lat: 0, lon: 0},
      %{lat: 51.5, lon: -0.12}, # London
      %{lat: 35.6, lon: 139.6}   # Tokyo
    ]

    state = %{
      turn_number: 1,
      active_sectors: active_sectors
    }

    Logger.info("GameLoop started. Turn 1 begins in #{@turn_interval_ms / 1000} seconds.")
    schedule_tick()
    {:ok, state}
  end

  @impl true
  def handle_info(:tick, state) do
    Logger.info("Processing Turn ##{state.turn_number} for #{Enum.count(state.active_sectors)} sectors...")

    # For each active sector, fetch its state from the simulation
    Enum.each(state.active_sectors, fn sector ->
      Logger.info("Fetching planet state for sector at lat=#{sector.lat}, lon=#{sector.lon}")

      case Engine.SimtellusClient.get_planet_state(sector.lat, sector.lon) do
        {:ok, %{body: planet_data}} ->
          Logger.info("Successfully fetched data for sector #{sector.lat},#{sector.lon}: #{inspect(planet_data)}")
          # TODO: Do something with the data, e.g., update game state for this sector.

        {:error, reason} ->
          Logger.error("Failed to fetch planet state for sector #{sector.lat},#{sector.lon}: #{inspect(reason)}")
      end
    end)

    schedule_tick()
    new_state = %{state | turn_number: state.turn_number + 1}
    {:noreply, new_state}
  end

  #
  # Private helpers
  #

  defp schedule_tick() do
    Process.send_after(self(), :tick, @turn_interval_ms)
  end
end
