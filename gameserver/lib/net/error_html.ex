defmodule Mutonex.Net.ErrorHTML do
  def render("500.html", _assigns) do
    "Internal Server Error"
  end

  def render("404.html", _assigns) do
    "Not Found"
  end
end
