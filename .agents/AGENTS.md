 # AGENTS.md: Development Guidelines for AI Agents

Mutonex implementation strives to reach four standards: secure,  pragmatic, succinct and accessible.

Mutonex is implemented with a functional style where possible, using Elixir, Ruby, and Deno JavaScript interpreters. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`. The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.

## Code Guidelines:
1. Functional style code, mix-ins, modules.
2. Don't repeat yourself (DRY).
3. Expressions formatted one thing per line.
4. One thing functions, limit blocks to >11 lines.
5. Lines as short as possible (60 chars).

## Getting Started

To install Elixir, run this script:
```bash
.agents/install_elixir.sh
```

To set up your development environment, run the following script:

```bash
.agents/agent_setup.sh
```

This will install all the necessary dependencies and start the required services.

## Running Tests

To run the tests for the `gameserver`, navigate to the `src/gameserver` directory and run the following command:

```bash
mix test
```

## Google Jules instructions

Never add or commit `.env` file into repository. Never remove `.env` file from `.gitignore` file. 

## Merge strategy for Google Jules

Jules bots need to pay specific attention to merge strategy, in oreder to avoid 'detached HEAD' state:
Avoid checking out specific commits or tags directly. So the git HEAD reference always points to a branch.
Perform merge operations by first checking out the target branch and then merging changes from the source branch:
```
$ git checkout target-branch
$ git merge source-branch
```
Merge conflicts must be solved carefully, ensuring the working or the newest changes are included. Then changes staged (git add) and committed.
