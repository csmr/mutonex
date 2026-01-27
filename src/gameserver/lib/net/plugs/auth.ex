defmodule Mutonex.Net.Plugs.Auth do
  import Plug.Conn

  # This function is called when the plug is initialized in the endpoint.
  # We don't have any options to pass, so we just return the empty list.
  def init(opts), do: opts

  # This is the main function of the plug. It's called for each request.
  def call(conn, _opts) do
    auth_header = get_req_header(conn, "authorization")
    api_key_header = get_req_header(conn, "api-key-hash")

    cond do
      # Support Authorization: Bearer <token>
      match?(["Bearer " <> _], auth_header) ->
        ["Bearer " <> token] = auth_header
        if valid_token?(token), do: conn, else: unauthorized(conn)

      # Support api-key-hash: <hash>
      api_key_header != [] ->
        [hash] = api_key_header
        if valid_hash?(hash), do: conn, else: unauthorized(conn)

      true ->
        unauthorized(conn)
    end
  end

  defp unauthorized(conn) do
    send_resp(conn, 401, "Unauthorized") |> halt()
  end

  defp valid_token?(_token) do
    # For now, all tokens are considered valid for development.
    # TODO: Implement proper token verification.
    true
  end

  defp valid_hash?(hash) do
    # In production, we would check against a stored hash or use a secure comparison.
    # For development/testing, we allow a specific hash or check an environment variable.
    expected_hash = System.get_env("API_KEY_HASH") || "YOUR_COMPILED_HASH_HERE"
    hash == expected_hash
  end
end
