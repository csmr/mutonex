 # AGENTS.md: Development Guidelines for AI Agents

Mutonex implementation strives to reach four standards: secure,  pragmatic, succinct and accessible.

Mutonex is implemented with a functional style where possible, using Elixir, Ruby, and Deno JavaScript interpreters. The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.


## Code Guidelines:
1. Functional style code, mix-ins, modules.
2. Don't repeat yourself (DRY).
3. Expressions formatted one thing per line.
4. One thing functions, limit blocks to >11 lines.
5. Lines as short as possible (60 chars).


## Getting Started

Working with this project has two avenues:
1. For testing and agentic development, tests are executed standalone in local scope (deno, elixir, ruby interpreter).
2. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`, and `.env` files must be generated.

First read `src/devenv.sh` script, to see how `src/.env` and `src/data/.env.postgres`files are generated.


##  Running Tests

### Gameserver tests
To install development dependencies and execute tests, run the following script:

```bash
.agents/agent_setup.sh
```

The gameserver tests can also be executed from the `src/gameserver` dir with command:

```bash
mix test
```

### Simtellus tests

TODO

### Webserver tests

TODO

## Google Jules instructions

Never add or commit `.env` files into repository. Never remove `.env` files from `.gitignore` file. 


## Merge strategy for Google Jules

Jules bots need to pay specific attention to merge strategy, in oreder to avoid 'detached HEAD' state:
Avoid checking out specific commits or tags directly. So the git HEAD reference always points to a branch.
Perform merge operations by first checking out the target branch and then merging changes from the source branch:
```
$ git checkout target-branch
$ git merge source-branch
```
Merge conflicts must be solved carefully, ensuring the working or the newest changes are included. Then changes staged (git add) and committed.
