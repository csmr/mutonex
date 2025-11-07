## Game Engine

Game session instances, sector scene graphs, game rule computation.

### Server

Elixir project, with Phoenix and WebSockets.

### Project structure
```
├── lib
│   ├── application.ex          # Application entry point
│   ├── engine
│   │   ├── entities.ex         # Game entity data structures
│   │   ├── game_session.ex     # Game session state management
│   │   ├── lidar.ex            # Rendering style
│   │   └── sparse_octree.ex    # Scene graph data structure
│   └── net
│       ├── endpoint.ex         # Phoenix endpoint configuration
│       ├── game_channel.ex     # WebSocket channel for game instances
│       └── user_socket.ex      # User socket for WebSocket connections
├── mix.exs                     # Elixir project configuration
├── README.md                   # This file
└── test
    ├── engine
    │   ├── entities_test.exs       # Tests for entities.ex
    │   ├── lidar_test.ex
    │   └── sparse_octree_test.exs  # Tests for sparse_octree.ex
    ├── gameserver_test.exs         # Tests for the application
    └── test.run.sh                 # Script to run tests
```
