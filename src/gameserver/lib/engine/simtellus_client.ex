defmodule Mutonex.Engine.SimtellusClient do
  @behaviour Mutonex.Engine.SimtellusClientBehaviour
  require Logger
  alias Mutonex.Simtellus.Simulation

  @doc """
  Fetches planet state for lat/lon from local Simulation.
  """
  def get_planet_state(lat, lon) do
    case Simulation.get_state(lat, lon) do
      {:ok, nil} ->
        {:error, :not_found}

      {:ok, state} ->
        # Convert atom keys to string keys
        string_key_map =
          state
          |> Enum.map(fn {k, v} ->
            {Atom.to_string(k), v}
          end)
          |> Map.new()

        {:ok, string_key_map}

      {:error, :not_ready} ->
        Logger.warning("Simtellus Simulation not ready.")
        {:error, :not_ready}

      error ->
        Logger.error("Simtellus error: #{inspect(error)}")
        {:error, error}
    end
  end

  @doc """
  Checks if the Simtellus Simulation is available.
  """
  def is_available? do
    case Process.whereis(Mutonex.Simtellus.Simulation) do
      nil -> false
      _pid -> true
    end
  end
end
