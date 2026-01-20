defmodule Mutonex.Engine.SimtellusClient do
  @behaviour Mutonex.Engine.SimtellusClientBehaviour
  require Logger
  alias Mutonex.Simtellus.Simulation

  @doc """
  Fetches the planet state for a given latitude and longitude from the local Simulation GenServer.

  ## Parameters
    - lat: The latitude of the sector.
    - lon: The longitude of the sector.

  ## Returns
    - `{:ok, body_map}` where `body_map` is the Elixir map with string keys (for compatibility).
    - `{:error, reason}` on failure.
  """
  def get_planet_state(lat, lon) do
    case Simulation.get_state(lat, lon) do
      {:ok, state} ->
        # Convert atom keys to string keys to maintain compatibility with existing consumers
        # (GameLoop expecting "temperature" etc. if it relies on string keys from JSON)
        # Wait, the previous JSON decoding produced string keys.
        # GameLoop.process_sector logs it: "#{inspect(planet_state_map)}"
        # And tests expect %{"temperature" => 25.0}
        # So we should convert to string keys.
        string_key_map =
          state
          # Simulation state value is a map with atom keys: %{energy: ..., temperature: ...}
          |> Enum.map(fn {k, v} -> {Atom.to_string(k), v} end)
          |> Map.new()

        {:ok, string_key_map}

      {:error, :not_ready} ->
        Logger.warning("Simtellus Simulation not ready.")
        {:error, :not_ready}

      error ->
        Logger.error("Simtellus Simulation error: #{inspect(error)}")
        {:error, error}
    end
  end

  @doc """
  Checks if the Simtellus Simulation is running and available.
  """
  def is_available? do
    case Process.whereis(Mutonex.Simtellus.Simulation) do
      nil -> false
      _pid -> true
    end
  end
end
