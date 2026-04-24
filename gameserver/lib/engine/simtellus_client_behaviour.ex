defmodule Mutonex.Engine.SimtellusClientBehaviour do
  @callback get_planet_state(lat :: float(), lon :: float()) :: {:ok, map()} | {:error, any()}
  @callback is_available?() :: boolean()
end
