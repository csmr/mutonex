ExUnit.start()

defmodule Mutonex.GameserverTest do
  use ExUnit.Case, async: true

  test "starts the application" do
    {:ok, _} = Application.ensure_all_started(:mutonex_server)
    assert :mutonex_server in (Application.started_applications() |> Enum.map(&elem(&1, 0)))
  end
end
