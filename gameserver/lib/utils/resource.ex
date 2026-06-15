defmodule Mutonex.Utils.Resource do
  @moduledoc """
  Utility for resolving resource paths at compile time.
  """

  @default_roots [
    "/app/res",
    "/res",
    "../../content/res",
    "../../../content/res"
  ]

  @roots Application.compile_env(
           :mutonex_server,
           [__MODULE__, :candidate_paths],
           @default_roots
         )

  @doc "Resolves a file path from a list of candidates."
  def resolve_path(filename, base_dir) do
    @roots
    |> Enum.map(&Path.expand(Path.join(&1, filename), base_dir))
    |> Enum.find(&File.exists?/1)
    |> handle_resolve_result(filename)
  end

  defp handle_resolve_result(nil, filename) do
    raise "Resource missing: #{filename}"
  end

  defp handle_resolve_result(path, _filename) do
    path
  end
end
