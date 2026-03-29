# Modularization and Packaging Strategy

## 1. Analysis: Accessibility vs. Separation of Concerns
Mutonex promises a "git clone and run" experience for developers. While architecturally separating the core engine, webclient, and game content is vital for maintainability (Separation of Concerns), splitting these into multiple repositories or complex packages can inadvertently increase the "Runtime Tax" on new developers.

**The "Pragmatic" Solution: A Monorepo with Flat Modules.**
To preserve accessibility while enforcing modularity, the project should move away from the current `src/` hierarchy and adopt a flat, top-level module structure.

## 2. Proposed Repository Structure
The repository should be organized at the root level, making the purpose of each directory explicit:

```text
mutonex/
├── platform/           # The Elixir/Phoenix game engine and simulation.
├── webclient/          # The TypeScript/Three.js frontend.
├── content/            # Game-specific assets, generators, and geodata.
├── infra/              # Container orchestration (compose.yaml, nginx, certs).
├── scripts/            # Infrastructure scripts (build, key generation, credits).
├── docs/               # Technical and design documentation.
├── todo/               # Ongoing project management.
└── mutonex.sh          # Root-level orchestrator (The "One Script").
```

### Advantages:
- **Zero Overhead**: No package managers (other than Mix and Deno) are required to manage the modules themselves.
- **Git Clone & Run**: The entire game environment is still acquired with a single command.
- **Explicit Boundaries**: Developers can work in `platform/` without needing to understand the internals of `webclient/`, as long as the interface (WebSocket API and static assets) is respected.

## 3. The Root-Level Orchestrator (`mutonex.sh`)
To maintain the "simplest" setup, a single bash script at the root (`mutonex.sh`) should act as the entry point. This script would replace `src/devenv.sh` and perform the following:

1.  **Dependency Sniffing**: Check for `docker-compose`, `deno`, and `mix` (or only `docker` if a fully containerized build is desired).
2.  **Environment Setup**: Initialize `.env` and DB credentials.
3.  **Module Assembly**:
    - Trigger the `webclient/` build to generate the frontend bundle.
    - Trigger the `content/` generators (if not already cached) to populate `platform/priv/static`.
4.  **Launch**: Execute `docker-compose up`.

## 4. Phased Transition
1.  **Phase 1**: Flatten the structure. Move `src/gameserver` to `platform/`, `src/webclient` to `webclient/`, and `src/res` to `content/`.
2.  **Phase 2**: Relocate `compose.yaml` and related configs to `infra/`.
3.  **Phase 3**: Implement `mutonex.sh` at the root and deprecate the `src/` directory entirely.

This approach ensures that the "game project" (Lore, Assets, World Data) remains decoupled from the "game platform" (Networking, Rendering, Simulation) without sacrificing the accessibility that makes Mutonex unique.
