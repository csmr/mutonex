defmodule Mutonex.Net.Notifier do
  @callback broadcast(String.t(), String.t(), map()) :: :ok | {:error, term()}
end
