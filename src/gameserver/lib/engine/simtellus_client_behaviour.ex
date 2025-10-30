defmodule Engine.SimtellusClientBehaviour do
  @callback get_planet_state(lat :: float(), lon :: float()) :: {:ok, map()} | {:error, any()}
end
