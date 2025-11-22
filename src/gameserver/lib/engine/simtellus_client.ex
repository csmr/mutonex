defmodule Mutonex.Engine.SimtellusClient do
  @behaviour Mutonex.Engine.SimtellusClientBehaviour
  use Tesla
  require Logger
  require Jason # 🌟 ADDED: Required for manual JSON decoding

  # Build the middleware stack dynamically.
  plug Tesla.Middleware.BaseUrl, System.get_env("PLANET_SIM_URL") || "http://planet_sim:4567"
  plug Tesla.Middleware.JSON
  plug Tesla.Middleware.Headers, [{"Host", "planet_sim"}]

  # Conditionally add API key authentication if the key is present in the environment.
  if _api_key = System.get_env("SIMTELLUS_API_KEY") do
    plug Tesla.Middleware.Headers, [{"api-key", _api_key}]
  end

  @doc """
  Fetches the planet state for a given latitude and longitude from the simtellus server.

  ## Parameters
    - lat: The latitude of the sector.
    - lon: The longitude of the sector.

  ## Returns
    - `{:ok, body_map}` where `body_map` is the parsed Elixir map.
    - `{:error, reason}` on failure.
  """
  def get_planet_state(lat, lon) do
    case get("/planet_state", query: [lat: lat, lon: lon]) do
      # Match on successful HTTP status (200..299)
      {:ok, %Tesla.Env{status: status, body: body, headers: headers}} when status in 200..299 ->
        # 🌟 FIX: Manually decode the body string, ignoring the incorrect Content-Type header.
        # This guarantees the GameLoop receives a decoded map.
        decoded_map = Jason.decode!(body)

        Logger.info("Tesla response: status=#{status}, body=#{inspect(decoded_map)}, headers=#{inspect(headers)}")
        {:ok, decoded_map}

      # Match on non-2xx status codes (e.g., 404, 500)
      {:ok, %Tesla.Env{status: status, body: body}} ->
        Logger.error("Tesla non-2xx response: status=#{status}, body=#{inspect(body)}")
        {:error, {:non_2xx_status, status, body}}

      # Match on network/connection errors
      {:error, reason} ->
        Logger.error("Tesla error: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
