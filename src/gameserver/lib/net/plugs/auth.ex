defmodule Net.Plugs.Auth do
  import Plug.Conn

  # This function is called when the plug is initialized in the endpoint.
  # We don't have any options to pass, so we just return the empty list.
  def init(opts), do: opts

  # This is the main function of the plug. It's called for each request.
  def call(conn, _opts) do
    # As noted before, get_req_header/2 is part of Plug.Conn and returns a list of strings.
    # The original code in endpoint.ex was trying to pattern match a tuple, which was a bug.
    # This implementation corrects the pattern matching.
    case get_req_header(conn, "authorization") do
      ["Bearer " <> auth_token] ->
        if valid_token?(auth_token) do
          conn
        else
          send_resp(conn, 401, "Unauthorized") |> halt()
        end

      _ ->
        send_resp(conn, 401, "Unauthorized") |> halt()
    end
  end

  defp valid_token?(_token) do
    # For now, all tokens are considered valid for development.
    # TODO: Implement proper token verification.
    true
  end
end
