defmodule Engine.SimtellusClient do
  @behaviour Engine.SimtellusClientBehaviour
  use Tesla

  # Build the middleware stack dynamically.
  plug Tesla.Middleware.BaseUrl, System.get_env("PLANET_SIM_URL") || "http://localhost:4567"
  plug Tesla.Middleware.JSON

  # Conditionally add API key authentication if the key is present in the environment.
  # This makes the client flexible for different deployment environments.
  if _api_key = System.get_env("SIMTELLUS_API_KEY") do
    plug Tesla.Middleware.Headers, [{"api-key", _api_key}]
  end

  @doc """
  Fetches the planet state for a given latitude and longitude from the simtellus server.

  ## Parameters
    - lat: The latitude of the sector.
    - lon: The longitude of the sector.

  ## Returns
    - `{:ok, response}` where `response.body` is the parsed JSON map.
    - `{:error, reason}` on failure.
  """
  def get_planet_state(lat, lon) do
    get("/planet_state", query: [lat: lat, lon: lon])
  end
end
