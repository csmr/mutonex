defmodule Mutonex.Engine.RelicPersistenceTest do
  use ExUnit.Case, async: false
  alias Mutonex.Engine.Systems.Environment
  alias Mutonex.Engine.GameSession
  alias Mutonex.Engine.Entities.Building
  import Mox

  setup :verify_on_exit!

  setup do
    try do
      set_mox_global(Mutonex.Engine.SimtellusClientMock)
    rescue
      _ -> :ok
    end

    env = [
      {:mutonex_server, :simtellus_client,
       Mutonex.Engine.SimtellusClientMock}
    ]

    Enum.each(env, fn {app, key, val} ->
      Application.put_env(app, key, val)
    end)

    stub(
      Mutonex.Engine.SimtellusClientMock,
      :is_available?,
      fn -> true end
    )

    :ok
  end

  test "valid_building_perimeter? enforces 2km distance" do
    b1 = %Building{
      id: "b1",
      type: :power_structure,
      position: %{x: 0, y: 0, z: 0},
      perimeter_radius: 2000.0
    }

    pos_near = %{x: 1000.0, y: 0, z: 0}
    pos_far = %{x: 2500.0, y: 0, z: 0}

    refute Environment.valid_building_perimeter?(
             [b1],
             pos_near,
             :power_structure
           )

    assert Environment.valid_building_perimeter?(
             [b1],
             pos_far,
             :power_structure
           )
  end

  test "valid_building_perimeter? exempts infrastructure" do
    b1 = %Building{
      id: "b1",
      type: :power_structure,
      position: %{x: 0, y: 0, z: 0},
      perimeter_radius: 2000.0
    }

    pos_near = %{x: 10.0, y: 0, z: 0}

    assert Environment.valid_building_perimeter?(
             [b1],
             pos_near,
             :conveyor_belt
           )
  end

  test "load_relics manifests spaced relics from Simtellus" do
    artifact = %{
      id: "relic_01",
      type: :relic,
      position: %{x: 5000.0, y: 0, z: 0},
      perimeter_radius: 2000.0,
      attributes: %{scale: 1.0}
    }

    stub(
      Mutonex.Engine.SimtellusClientMock,
      :get_artifacts,
      fn 10, 20 -> [artifact] end
    )

    state = Environment.initial_state("sector_10_20")
    state = Environment.build(state)

    relic = Enum.find(state.buildings, &(&1.id == "relic_01"))
    assert relic != nil
    assert relic.status == :ruined
    assert relic.position.x == 5000.0
  end

  test "persist_relics saves non-exempt session buildings" do
    sid = "sector_10_20_test_#{System.unique_integer()}"
    test_pid = self()

    stub(
      Mutonex.Engine.SimtellusClientMock,
      :get_artifacts,
      fn _, _ -> [] end
    )

    stub(
      Mutonex.Engine.SimtellusClientMock,
      :add_artifact,
      fn 10, 20, art ->
        send(test_pid, {:artifact_saved, art})
        :ok
      end
    )

    {:ok, pid} = GameSession.start_link(sid)
    wait_for_phase(pid, :lobby)
    GenServer.cast(pid, {:player_joined, "user1", self()})
    wait_for_phase(pid, :gamein)

    :ok = GameSession.persist_relics(pid)

    assert_receive {:artifact_saved, saved_art}
    assert saved_art.status == :ruined
  end

  defp wait_for_phase(pid, expected_phase, retries \\ 10) do
    state = :sys.get_state(pid)

    if state.phase == expected_phase do
      assert state.phase == expected_phase
    else
      if retries > 0 do
        Process.sleep(50)
        wait_for_phase(pid, expected_phase, retries - 1)
      else
        flunk("Got #{state.phase}, expected #{expected_phase}")
      end
    end
  end
end
