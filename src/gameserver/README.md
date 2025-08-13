## Game Engine

Game session instances, sector scene graphs, game rule computation.

### Server

Elixir project, with Phoenix and WebSockets.

### Project structure
```
├── lib
│   ├── application.ex          # Application entry point
│   ├── engine
│   │   ├── game_instance.ex    # Game instance logic
│   │   └── sparse_octree.ex    # scenegraph type
│   └── net
│       ├── endpoint.ex         # Phoenix endpoint conf
│       ├── game_channel.ex     # WebSocket channel for game instances
│       └── user_socket.ex      # User socket for WebSocket connections
├── mix.exs                     # project conf
├── README.md                   # Documentation
└── test
    ├── engine
    │   ├── game_instance_test.exs  # Tests for game instance logic
    │   └── sparse_octree_test.exs  # Tests for sparse octree
    ├── gameserver_test.exs         # Tests for the application
    └── test.run.sh                 # Script to run tests
```


