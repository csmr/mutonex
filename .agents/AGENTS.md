# AGENTS.md: Development Guidelines for AI Agents

Mutonex implementation strives to reach four standards:
secure, pragmatic, succinct, and accessible.

Mutonex uses a functional style with Elixir and Deno JS.
Implementation minimizes module coupling. Test scripts are
standalone, existing for each module.

## Code Guidelines
1. Functional programming code, mixins, modules.
2. Don't repeat yourself (DRY).
3. Expressions formatted one thing per line.
4. One thing functions, limit blocks to <11 lines.
5. Lines as short as possible (<68 chars).
6. Use data-driven maps instead of imperative code.

## Git Workflow
- Use kebab-case-YYYYMMDDhhmm for branches and filenames
  (e.g., feature/paraply-detergent-fixes-202008010801).
- Prefix branches: [feat-|bugfix-|maintenance-]
- After rebasing, merge with `git merge -Xours/theirs`.

## Testing & Utilities
- Run webclient unit tests: `bash .agents/test_webclient.sh`
- Run gameserver unit tests: `bash .agents/test_gameserver.sh`
  - Core game loop & session management.
  - Simtellus planet simulation (`Mutonex.Simtellus`).
  - Network layer (Router, Channels, Controllers).
  - Database connectivity & repository logic.
- Run E2E tests: `bash webclient/scripts/test_e2e.sh`
- Format files: `bash scripts/format_doc.sh [-f]`

## Getting Started
1. Read `devenv.sh` for env generation.
2. Read `README.md` for module development basics.
3. Read `docs/mutonex-design-document.html` TOC for index.
4. Install dependencies: `bash .agents/agent_setup.sh`
5. Verify webclient bundle: `bash webclient/build-webclient.sh`

## Directories
- Use `docs/` for reference.
- Use `todo/` for active TODOs.
