defmodule Mutonex.Engine.EntitiesTest do
  defp test(description, test_fun) do
    if test_fun.() do
      IO.puts(">> #{description} pass: true")
      :ok
    else
      IO.puts(">> #{description} pass: false")
      :fail
    end
  end

  defp check(condition) do
    condition
  end

  def run_all_tests do
    IO.puts("Testrun for #{__MODULE__}")

    results = [
      # Unit tests
      test("can create a Unit struct with default values", fn ->
        unit = %Mutonex.Engine.Entities.Unit{}
        check(unit.id == nil) &&
        check(unit.type == nil) &&
        check(unit.position == %{x: 0, y: 0, z: 0}) &&
        check(unit.society_id == nil) &&
        check(unit.home_id == nil) &&
        check(unit.sight_area == 0) &&
        check(unit.attributes == %{charm: 0, tribe: nil, flavor: nil}) &&
        check(unit.history == %{})
      end),

      test("can create a Unit struct with specific values", fn ->
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
        unit = struct(Mutonex.Engine.Entities.Unit, unit_data)
        check(unit.id == 1) &&
        check(unit.type == :head) &&
        check(unit.position == %{x: 10, y: 20, z: 5}) &&
        check(unit.society_id == 100) &&
        check(unit.home_id == 200) &&
        check(unit.sight_area == 5) &&
        check(unit.attributes.charm == 10) &&
        check(unit.history.birth == ~D[2023-01-01])
      end),

      # Building tests
      test("can create a Building struct with default values", fn ->
        building = %Mutonex.Engine.Entities.Building{}
        check(building.id == nil) &&
        check(building.type == nil) &&
        check(building.position == %{x: 0, y: 0, z: 0}) &&
        check(building.society_id == nil) &&
        check(building.chief_id == nil) &&
        check(building.sight_area == 0) &&
        check(building.function == nil) &&
        check(building.history == %{})
      end),

      test("can create a Building struct with specific values", fn ->
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
        building = struct(Mutonex.Engine.Entities.Building, building_data)
        check(building.id == 2) &&
        check(building.type == :power_structure) &&
        check(building.position.x == 50) &&
        check(building.society_id == 100) &&
        check(building.function == :resource_conversion)
      end),

      # Society tests
      test("can create a Society struct with default values", fn ->
        society = %Mutonex.Engine.Entities.Society{}
        check(society.id == nil) &&
        check(society.home_id == nil) &&
        check(society.ethnicity == nil) &&
        check(society.player_id == nil)
      end),

      test("can create a Society struct with specific values", fn ->
        society_data = %{
          id: 100,
          home_id: 2,
          ethnicity: :french,
          player_id: 500
        }
        society = struct(Mutonex.Engine.Entities.Society, society_data)
        check(society.id == 100) &&
        check(society.ethnicity == :french) &&
        check(society.player_id == 500)
      end),

      # Fauna tests
      test("can create a Fauna struct with default values", fn ->
        fauna = %Mutonex.Engine.Entities.Fauna{}
        check(fauna.id == nil) &&
        check(fauna.sector_id == nil) &&
        check(fauna.ethnicity == nil)
      end),

      test("can create a Fauna struct with specific values", fn ->
        fauna_data = %{
          id: 3,
          sector_id: 10,
          ethnicity: :fauna_french
        }
        fauna = struct(Mutonex.Engine.Entities.Fauna, fauna_data)
        check(fauna.id == 3) &&
        check(fauna.sector_id == 10) &&
        check(fauna.ethnicity == :fauna_french)
      end),

      # Mineral tests
      test("can create a Mineral struct with default values", fn ->
        mineral = %Mutonex.Engine.Entities.Mineral{}
        check(mineral.id == nil) &&
        check(mineral.position == %{x: 0, y: 0, z: 0}) &&
        check(mineral.type == nil)
      end),

      test("can create a Mineral struct with specific values", fn ->
        mineral_data = %{
          id: 4,
          position: %{x: 80, y: 120, z: 0},
          type: :iron
        }
        mineral = struct(Mutonex.Engine.Entities.Mineral, mineral_data)
        check(mineral.id == 4) &&
        check(mineral.position.y == 120) &&
        check(mineral.type == :iron)
      end)
    ]

    all_passed = Enum.all?(results, fn status -> status == :ok end)
    if all_passed do
      IO.puts("\nSuper! Tests pass.")
    else
      IO.puts("\nFail!!! Test(s) not passing.")
      System.halt(1)
    end
  end
end

# Run the tests
Mutonex.Engine.EntitiesTest.run_all_tests()
