defmodule Mutonex.Engine.GameLoop do
  use GenServer
  require Logger

  @turn_interval_ms Application.compile_env(
                      :mutonex_server,
                      [__MODULE__, :turn_interval_ms],
                      20_000
                    )

  #
  # Client API
  #

  @doc """
  Starts the game loop GenServer.
  """
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts,
      name: __MODULE__
    )
  end

  @doc """
  Synchronous call for testing purposes.
  """
  def sync(pid) do
    GenServer.call(pid, :sync)
  end

  #
  # GenServer Callbacks
  #

  @impl true
  def init(opts) do
    cfg = Mutonex.Utils.ConfigReader.get(__MODULE__)
    active_sectors = cfg[:active_sectors] || []

    state = %{
      turn_number: 1,
      active_sectors: active_sectors
    }

    if Keyword.get(opts, :start_ticking, true) do
      Logger.info(
        "GameLoop started. Turn 1 begins in " <>
          "#{:erlang.div(@turn_interval_ms, 1000)} seconds."
      )
      schedule_tick()
    end

    {:ok, state}
  end

  @impl true
  def handle_info(:tick, state) do
    client =
      Application.get_env(
        :mutonex_server,
        :simtellus_client,
        Mutonex.Engine.SimtellusClient
      )

    Logger.info(
      "Processing Turn ##{state.turn_number} for " <>
        "#{Enum.count(state.active_sectors)} sectors..."
    )

    # Process all sectors using the abstracted function.
    Enum.each(
      state.active_sectors,
      &process_sector(client, &1)
    )

    schedule_tick()

    new_state =
      %{
        state
        | turn_number: state.turn_number + 1
      }

    {:noreply, new_state}
  end

  @impl true
  def handle_call(:sync, _from, state) do
    {:reply, :ok, state}
  end

  #
  # Private helpers
  #

  defp process_sector(client, sector) do
    lat = sector.lat
    lon = sector.lon
    registry_key = "sector_#{lat}_#{lon}"
    dev_sid = "Sector Alpha (Dev)"

    Logger.info(
      "Fetching planet state for sector at " <>
        "lat=#{lat}, lon=#{lon}"
    )

    case client.get_planet_state(lat, lon) do
      {:ok, planet_state_map} when is_map(planet_state_map) ->
        Logger.info(
          "Successfully fetched and decoded data for sector " <>
            "#{lat},#{lon}: #{inspect(planet_state_map)}"
        )

        # Broadcast to matching game sessions
        [registry_key, dev_sid]
        |> Enum.each(fn key ->
          Registry.dispatch(Mutonex.GameRegistry, key, fn entries ->
            Enum.each(entries, fn {pid, _} ->
              send(pid, {:update_planet_state, planet_state_map})
            end)
          end)
        end)

        :ok

      {:error, reason} ->
        Logger.error(
          "Failed to fetch planet state for sector " <>
            "#{lat},#{lon}: #{inspect(reason)}"
        )
    end
  end

  defp schedule_tick() do
    Process.send_after(
      self(),
      :tick,
      @turn_interval_ms
    )
  end
end
