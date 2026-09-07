defmodule Mutonex.Engine.SimtellusClientBehaviour do
  @callback get_planet_state(lat :: float(), lon :: float()) ::
              {:ok, map()} | {:error, any()}
  @callback get_artifacts(lat :: float(), lon :: float()) :: list()
  @callback add_artifact(
              lat :: float(),
              lon :: float(),
              art :: map()
            ) :: :ok
  @callback is_available?() :: boolean()
end
