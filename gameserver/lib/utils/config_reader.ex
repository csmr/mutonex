defmodule Mutonex.Utils.ConfigReader do
  @moduledoc """
  Read-only utility accessors for application configuration.
  Ensures DRY access to :mutonex_server environment.
  """

  @doc "Gets all config for a module."
  def get(module, default \\ []) do
    Application.get_env(:mutonex_server, module, default)
  end

  @doc "Gets a specific key from a module's config."
  def get(module, key, default) do
    Keyword.get(get(module), key, default)
  end
end
