 # AGENTS.md: Development Guidelines for AI Agents

Mutonex implementation strives to reach four standards: secure, pragmatic, succinct and accessible.

Mutonex is implemented with a functional style where possible, using Elixir and Deno JavaScript interpreters. The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.


## Code Guidelines:
1. Functional programming code, mix-ins, modules.
2. Don't repeat yourself (DRY).
3. Expressions formatted one thing per line.
4. One thing functions, limit blocks to >11 lines.
5. Lines as short as possible (60 chars).


## Getting Started

Working with this project has two avenues:
1. For testing and agentic development, tests are executed standalone in local scope (deno, elixir interpreter).
2. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`, and `.env` files must be generated.

First read `src/devenv.sh` script, to see how `src/.env` and `src/data/.env.postgres` files are generated.

Read the game design document `./docs/mutonex-design-document.html` Table of Contents, and use that as an index for finding implementation design related details.

Read the game design document `./docs/mutonex-design-document.html` Table of Contents, and use that as an index for finding implementation design related details.

## Install dependencies

To install development dependencies and execute gameserver tests, run the following script:

```bash
bash .agents/agent_setup.sh
```

## Running Tests

### Gameserver & Simulation tests

The gameserver now absorbs both the web serving logic and the Simtellus planet simulation. All backend logic is tested via Elixir's ExUnit. Execute from the `src/gameserver` directory:

```bash
mix test
```

This covers:
- Core game loop and session management.
- Simtellus planet simulation (`Mutonex.Simtellus`).
- Network layer (Router, Channels, Controllers).
- Database connectivity and repository logic.

### Webclient verification

To verify the webclient, ensure it can be successfully bundled:

```bash
cd src && bash scripts/bundle-webclient.sh
```


## Google Jules instructions

Never add or commit `.env` files into repository. Never remove `.env` files from `.gitignore` file. 

Name git branches with prefix: feat-|bugfix-|mainteinance- and use date postfix: -YYYYMMDDHHMM (instead of random number).


## Merge strategy for Google Jules

Jules bots need to pay specific attention to merge strategy, in order to avoid 'detached HEAD' state:
Avoid checking out specific commits or tags directly. So the git HEAD reference always points to a branch.
Perform merge operations by first checking out the target branch and then merging changes from the source branch:
```
$ git checkout target-branch
$ git merge source-branch
```
Merge conflicts must be solved carefully, ensuring the working or the newest changes are included. Then changes staged (git add) and committed.
