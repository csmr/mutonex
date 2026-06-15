import Config

config :mutonex_server, Mutonex.Utils.Resource,
  candidate_paths: [
    "/app/res",
    "/res",
    "../../content/res",
    "../../../content/res"
  ]

config :mutonex_server, Mutonex.Utils.MessageToken,
  entropy_bytes: 32
