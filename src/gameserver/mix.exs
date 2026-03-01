defmodule Mutonex.Game.MixProject do
  use Mix.Project

  def project do
    [
      app: :mutonex_server,
      version: "0.2.19",
      elixir: "~> 1.14",
      target: :node,
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      elixirc_paths: elixirc_paths(Mix.env()),
      config_path: "config/config.exs"
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      mod: {Mutonex.Server.Application, []},
      extra_applications: extra_applications()
    ]
  end

  defp extra_applications() do
    case Mix.env() do
      :test -> [:logger, :runtime_tools, :mox]
      _ -> [:logger, :runtime_tools]
    end
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:phoenix, "~> 1.7"}, # latest stable version
      {:phoenix_pubsub, "~> 2.1"},
      {:phoenix_html, "~> 3.3"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:jason, "~> 1.4"},
      {:plug_cowboy, "~> 2.6"},
      {:tesla, "~> 1.4"},
      {:mox, "~> 1.0", only: :test},
      {:yaml_elixir, "~> 2.8.0"},
      {:ecto_sql, "~> 3.10"},
      {:postgrex, "~> 0.17.0"}
    ]
  end
end
