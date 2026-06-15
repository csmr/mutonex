defmodule Mutonex.Net.PhoenixNotifier do
  @behaviour Mutonex.Net.Notifier
  alias Mutonex.Net.Endpoint

  def broadcast(topic, event, payload) do
    Endpoint.broadcast(topic, event, payload)
  end
end
