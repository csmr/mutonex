ExUnit.start()

defmodule GameserverTest do
  use ExUnit.Case, async: true

  test "starts the application" do
    {:ok, _} = Application.ensure_all_started(:gameserver)
    assert Application.started?(:gameserver)
  end
end
