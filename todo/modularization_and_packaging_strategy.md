# Modularization and Packaging Strategy

## 1. Analysis: Accessibility vs. Separation of Concerns
Mutonex promises a "git clone and run" experience for developers. While architecturally separating the core game engine, webclient, and game content is vital for maintainability (Separation of Concerns), splitting these into multiple repositories or complex packages can inadvertently increase the "Runtime Tax" on new developers.

**The "Pragmatic" Solution: A Monorepo with Flat Modules.**
To preserve accessibility while enforcing modularity, the project should move away from the current `src/` hierarchy and adopt a flat, top-level module structure.

## 2. Proposed Repository Structure
The repository should be organized at the root level, making the purpose of each directory explicit:

```text
mutonex/
├── platform/           # The Elixir/Phoenix game engine and simulation.
├── webclient/          # The TypeScript/Three.js frontend.
├── content/            # Game-specific assets, generators, and geodata.
├── infra/              # Container orchestration (compose.yaml, nginx, certs, terraform).
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

1.  **Dependency Sniffing**: Check for `docker-compose`, `deno`, and `mix`.
2.  **Environment Setup**: Initialize `.env` and DB credentials.
3.  **Module Assembly**:
    - Trigger the `webclient/` build to generate the frontend bundle.
    - Trigger the `content/` generators (if not already cached) to populate `platform/priv/static`.
4.  **Launch**: Execute `docker-compose up`.

## 4. Phased Implementation (Monorepo Transformer)
The transition is orchestrated by `monorepo_transformer_20260329.sh` in four phases:

- **Phase 1**: **Basic Structure Initialization.** Create top-level directories (`platform/`, `webclient/`, `content/`, `infra/`, `scripts/`).
- **Phase 2**: **Webclient Module Transformation.** Relocate `src/webclient/`, `src/deno.json`, and webclient infrastructure scripts. Move essential dependencies (`src/res/`, `app.config.sh`) to their new homes. Update relative paths.
- **Phase 3**: **Platform and Infra Transformation.** Relocate the Elixir engine (`src/gameserver/`) and container/deployment configs (`src/compose.yaml`, `src/conf/`, `infra/terraform/`).
- **Phase 4**: **Finalize and Merge.** Implement the root-level `mutonex.sh`, clean up the `src/` directory, and merge to `develop`.
