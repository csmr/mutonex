defmodule Mutonex.Net.Controllers.DiagController do
  use Phoenix.Controller, formats: [:html, :json]
  require Logger
  alias Mutonex.Simtellus.Planet

  def weather_history(conn, %{"lat" => lat_s, "lon" => lon_s}) do
    {lat, _} = Float.parse(lat_s)
    {lon, _} = Float.parse(lon_s)
    now = Date.utc_today()

    history = for year_off <- 0..4 do
      year = now.year - year_off
      %{year: year, months: calculate_year_weather(year, lat, lon)}
    end

    json(conn, %{lat: lat, lon: lon, history: history})
  end

  defp calculate_year_weather(year, lat, _lon) do
    for month <- 1..12 do
      date = Date.new!(year, month, 15)
      day = Date.day_of_year(date)
      %{
        month: month,
        temp: Planet.temp(day, lat, 0, 0),
        pressure: Planet.pressure(day, lat, 0),
        insolation: Planet.irradiance_daily_wm2(lat, day)
      }
    end
  end

  def db_test(conn, _params) do
    repo_pid = Process.whereis(Mutonex.Server.Repo)

    if repo_pid == nil do
      json(conn, %{status: "error", db: "not_started"})
    else
      try do
        case Mutonex.Server.Repo.query("SELECT 1") do
          {:ok, _} -> json(conn, %{status: "ok", db: "connected"})
          {:error, err} ->
            Logger.error("DB Error: #{inspect(err)}")
            json(conn, %{status: "error", db: inspect(err)})
        end
      rescue
        e ->
          Logger.error("DB Exception: #{inspect(e)}")
          json(conn, %{status: "error", db: "exception"})
      end
    end
  end
end
