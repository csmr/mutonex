defmodule Mutonex.Net.Plugs.Auth do
  @moduledoc """
  Plug for handling API key and Bearer token authentication.
  Can be optionally disabled for development/testing environments.
  """
  import Plug.Conn
  alias Mutonex.Utils.ConfigReader

  # Initialize the plug by loading configuration once during application boot.
  def init(_opts) do
    cfg = ConfigReader.get(__MODULE__)

    %{
      enabled: cfg[:api_key_auth_enabled],
      configured_hash: cfg[:api_key_hash]
    }
  end

  # The main entry point for the plug, using pre-loaded configuration.
  def call(conn, opts) do
    case opts.enabled do
      true -> perform_auth(conn, opts)
      _ -> conn
    end
  end

  # --- Private Helpers ---

  defp perform_auth(conn, opts) do
    auth_header = get_req_header(conn, "authorization")
    api_key_header = get_req_header(conn, "api-key-hash")

    cond do
      # Support Authorization: Bearer <token>
      match?(["Bearer " <> _], auth_header) ->
        ["Bearer " <> token] = auth_header
        handle_token_auth(conn, token)

      # Support api-key-hash: <hash>
      api_key_header != [] ->
        [hash] = api_key_header
        handle_hash_auth(conn, hash, opts.configured_hash)

      true ->
        unauthorized(conn)
    end
  end

  defp handle_token_auth(conn, token) do
    if valid_token?(token), do: conn, else: unauthorized(conn)
  end

  defp handle_hash_auth(conn, hash, configured_hash) do
    if valid_hash?(hash, configured_hash), do: conn, else: unauthorized(conn)
  end

  defp unauthorized(conn) do
    send_resp(conn, 401, "Unauthorized") |> halt()
  end

  defp valid_token?(_token) do
    # For now, all tokens are considered valid for development.
    true
  end

  defp valid_hash?(hash, configured_hash) do
    # Use timing-safe comparison to prevent side-channel attacks.
    case configured_hash do
      nil -> false
      "" -> false
      _ -> Plug.Crypto.secure_compare(hash, configured_hash)
    end
  end
end
