defmodule Mutonex.Engine.NpcBehaviorTest do
  use ExUnit.Case, async: true
  alias Mutonex.Engine.NpcBehavior

  describe "decide_action/2" do
    test "returns an action for each supported type" do
      for type <- [:fauna, :local, :activist, :chief, :air_power] do
        action = NpcBehavior.decide_action(type)
        assert is_atom(action)
        assert action != :idle
      end
    end

    test "returns :idle for unknown types" do
      assert NpcBehavior.decide_action(:unknown) == :idle
    end

    test "honors policy for locals" do
      # Run multiple times to observe distribution
      actions = Enum.map(1..100, fn _ ->
        NpcBehavior.decide_action(:local, :aggressive)
      end)

      # In aggressive policy, :wander weight (60) is higher than :work (30) or :build (10)
      # We check if wander is present in the distribution.
      assert Enum.member?(actions, :wander)
      assert Enum.member?(actions, :work)
    end
  end

  describe "select_weighted/1" do
    test "returns :idle for empty weights" do
      assert NpcBehavior.select_weighted(%{}) == :idle
    end

    test "always returns the action if it's the only one" do
      assert NpcBehavior.select_weighted(%{test_action: 100}) == :test_action
    end

    test "distributes actions based on weight" do
      weights = %{a: 999, b: 1}
      results = Enum.map(1..100, fn _ -> NpcBehavior.select_weighted(weights) end)

      # 'a' should be much more frequent than 'b'
      count_a = Enum.count(results, &(&1 == :a))
      count_b = Enum.count(results, &(&1 == :b))

      assert count_a > count_b
    end
  end
end
