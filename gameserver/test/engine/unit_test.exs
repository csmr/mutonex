defmodule Mutonex.Engine.UnitTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.Unit, as: UnitLogic
  alias Mutonex.Engine.Entities.Unit, as: UnitEntity

  test "returns correct profile for head unit" do
    profile = UnitLogic.profile(:head)
    assert profile.movement_speed == 120.0
    assert profile.sight_radius == 10.0
    assert profile.is_charmable == false
    assert profile.work_hours == 14
    assert profile.rest_hours == 8
  end

  test "returns correct profile for chief unit" do
    profile = UnitLogic.profile(:chief)
    assert profile.movement_speed == 110.0
    assert profile.sight_radius == 10.0
    assert profile.is_charmable == true
    assert profile.work_hours == 12
  end

  test "returns correct profile for follower and local units" do
    follower = UnitLogic.profile(:follower)
    local = UnitLogic.profile(:local)
    assert follower.movement_speed == 80.0
    assert follower.is_charmable == true
    assert local.movement_speed == 80.0
    assert local.is_charmable == true
  end

  test "returns correct profile for activist unit" do
    profile = UnitLogic.profile(:activist)
    assert profile.movement_speed == 100.0
    assert profile.is_charmable == true
    assert profile.work_hours == 10
  end

  test "returns correct profile for air_power unit" do
    profile = UnitLogic.profile(:air_power)
    assert profile.movement_speed == 220.0
    assert profile.sight_radius == 50.0
    assert profile.is_charmable == false
    assert profile.work_hours == 1
  end

  test "builds unit with defaults and overrides" do
    head = UnitLogic.build(:head, %{id: "u_head"})
    assert head.id == "u_head"
    assert head.type == :head
    assert head.movement_speed == 120.0
    assert head.sight_radius == 10.0
    assert head.is_charmable == false

    follower = UnitLogic.build(:follower, %{id: "u_fol"})
    assert follower.type == :follower
    assert follower.movement_speed == 80.0
    assert follower.is_charmable == true
  end

  test "computes movement speed and max speed in m/s" do
    u = %UnitEntity{type: :head, movement_speed: 120.0}
    assert UnitLogic.movement_speed(u) == 120.0
    assert_in_delta UnitLogic.max_speed_ms(u), 33.333, 0.01

    assert UnitLogic.movement_speed(:chief) == 110.0
    assert_in_delta UnitLogic.max_speed_ms(:chief), 30.555, 0.01
  end

  test "evaluates charmability correctly" do
    assert UnitLogic.charmable?(:head) == false
    assert UnitLogic.charmable?(:chief) == true
    assert UnitLogic.charmable?(:follower) == true
    assert UnitLogic.charmable?(:air_power) == false

    u_head = %UnitEntity{type: :head, is_charmable: false}
    assert UnitLogic.charmable?(u_head) == false
  end
end
