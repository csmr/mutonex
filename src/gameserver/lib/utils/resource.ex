defmodule Mutonex.Utils.Resource do
  @moduledoc """
  Utility for resolving resource paths at compile time.
  """

  @doc "Resolves a file path from a list of candidates."
  def resolve_path(filename, base_dir) do
    candidates(filename)
    |> Enum.map(&Path.expand(&1, base_dir))
    |> Enum.find(&File.exists?/1)
    |> case do
      nil ->
        raise "Resource missing: #{filename}"

      path ->
        path
    end
  end

  defp candidates(name) do
    [
      "/app/res/#{name}",
      "/res/#{name}",
      "../../res/#{name}",
      "../../../res/#{name}"
    ]
  end
end
