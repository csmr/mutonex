defmodule Mutonex.Net.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :auth do
    plug Mutonex.Net.Plugs.Auth
  end

  scope "/", Mutonex.Net.Controllers do
    pipe_through :api

    get "/", PageController, :index
    get "/health", HealthController, :index
    get "/db-test", DiagController, :db_test
  end

  scope "/api", Mutonex.Net.Controllers do
    pipe_through :api

    # Public routes
    # post "/login", AuthController, :login

    pipe_through :auth
    # Protected routes
    get "/db-test", DiagController, :db_test
  end
end
