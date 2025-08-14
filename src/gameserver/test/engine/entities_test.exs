defmodule Mutonex.Engine.EntitiesTest do
  @on_load :run_tests_on_load

  # To run this test script, execute `elixir -r <path_to_this_file>`

  alias Mutonex.Engine.Entities

  def run_tests_on_load do
    # Load dependencies
    entities_file = Path.expand("../../../lib/engine/entities.ex", __DIR__)
    Code.load_file(entities_file)

    # Run tests
    run_all_tests()
    :ok
  end

  defp test(description, test_fun) do
    try do
      test_fun.()
      IO.puts(">> #{description} pass: true")
      :ok
    rescue
      e in [AssertionError] ->
        IO.puts(">> #{description} pass: false")
        IO.puts(Exception.format(:error, e, System.stacktrace()))
        :fail
      e ->
        IO.puts(">> #{description} pass: false (unexpected error)")
        IO.inspect(e)
        :fail
    end
  end

  def run_all_tests do
    IO.puts("Testrun for #{__MODULE__}")

    results = [
      test("can create a Unit struct with default values", fn ->
        unit = %Entities.Unit{}
        assert unit.id == nil
        assert unit.type == nil
        assert unit.position == %{x: 0, y: 0, z: 0}
        assert unit.society_id == nil
        assert unit.home_id == nil
        assert unit.sight_area == 0
        assert unit.attributes == %{charm: 0, tribe: nil, flavor: nil}
        assert unit.history == %{}
      end),

      test "can create a Unit struct with specific values", fn ->
        unit_data = %{
          id: 1,
          type: :head,
          position: %{x: 10, y: 20, z: 5},
          society_id: 100,
          home_id: 200,
          sight_area: 5,
          attributes: %{charm: 10, tribe: :potassium, flavor: :red},
          history: %{birth: ~D[2023-01-01]}
        }
        unit = struct(Entities.Unit, unit_data)
        assert unit.id == 1
        assert unit.type == :head
        assert unit.position == %{x: 10, y: 20, z: 5}
        assert unit.society_id == 100
        assert unit.home_id == 200
        assert unit.sight_area == 5
        assert unit.attributes.charm == 10
        assert unit.history.birth == ~D[2023-01-01]
      end,

      test "can create a Building struct with default values", fn ->
        building = %Entities.Building{}
        assert building.id == nil
        assert building.type == nil
        assert building.position == %{x: 0, y: 0, z: 0}
        assert building.society_id == nil
        assert building.chief_id == nil
        assert building.sight_area == 0
        assert building.function == nil
        assert building.history == %{}
      end,

      test "can create a Building struct with specific values", fn ->
        building_data = %{
          id: 2,
          type: :power_structure,
          position: %{x: 50, y: 50, z: 10},
          society_id: 100,
          chief_id: 1,
          sight_area: 10,
          function: :resource_conversion,
          history: %{built: ~D[2023-05-10]}
        }
        building = struct(Entities.Building, building_data)
        assert building.id == 2
        assert building.type == :power_structure
        assert building.position.x == 50
        assert building.society_id == 100
        assert building.function == :resource_conversion
      end,

      test "can create a Society struct with default values", fn ->
        society = %Entities.Society{}
        assert society.id == nil
        assert society.home_id == nil
        assert society.ethnicity == nil
        assert society.player_id == nil
      end,

      test "can create a Society struct with specific values", fn ->
        society_data = %{
          id: 100,
          home_id: 2,
          ethnicity: :french,
          player_id: 500
        }
        society = struct(Entities.Society, society_data)
        assert society.id == 100
        assert society.ethnicity == :french
        assert society.player_id == 500
      end,

      test "can create a Fauna struct with default values", fn ->
        fauna = %Entities.Fauna{}
        assert fauna.id == nil
        assert fauna.sector_id == nil
        assert fauna.ethnicity == nil
      end,

      test "can create a Fauna struct with specific values", fn ->
        fauna_data = %{
          id: 3,
          sector_id: 10,
          ethnicity: :fauna_french
        }
        fauna = struct(Entities.Fauna, fauna_data)
        assert fauna.id == 3
        assert fauna.sector_id == 10
        assert fauna.ethnicity == :fauna_french
      end,

      test "can create a Mineral struct with default values", fn ->
        mineral = %Entities.Mineral{}
        assert mineral.id == nil
        assert mineral.position == %{x: 0, y: 0, z: 0}
        assert mineral.type == nil
      end,

      test "can create a Mineral struct with specific values", fn ->
        mineral_data = %{
          id: 4,
          position: %{x: 80, y: 120, z: 0},
          type: :iron
        }
        mineral = struct(Entities.Mineral, mineral_data)
        assert mineral.id == 4
        assert mineral.position.y == 120
        assert mineral.type == :iron
      end
    ]

    all_passed = Enum.all?(results, fn status -> status == :ok end)

    if all_passed do
      IO.puts("\nSuper! Tests pass.")
    else
      IO.puts("\nFail!!! Test(s) not passing.")
    end
  end
end
