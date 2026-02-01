defmodule TestPath do
  @paths ["../../res/regions.yaml", "../../../res/regions.yaml"]
  @res_path (
    @paths
    |> Enum.map(&Path.expand(&1, __DIR__))
    |> Enum.find(&File.exists?/1)
  )
  def path, do: @res_path
end
IO.puts "Resolved path: #{TestPath.path()}"
