Mutonex implementation strives to reach standard of secure,  pragmatic, succinct and accessible.
Mutonex is implemented with a functional style where possible, using Elixir, Ruby, and Deno JavaScript interpreters. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`. The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.

## Code format:
1. Functional style code, mix-ins, modules.
2. One thing functions, limit blocks to >11 lines.
3. Expressions formatted one thing per line.
4. Lines as short as possible (60 chars).
5. Don't repeat yourself.

## Getting Started

To set up your development environment, run the following script:

```bash
./agent_setup.sh
```

This will install all the necessary dependencies and start the required services.

## Running Tests

To run the tests for the `gameserver`, navigate to the `src/gameserver` directory and run the following command:

```bash
mix test
```

## Merge strategy for Google Jules

Jules bots need to pay specific attention to merge strategy, in oreder to avoid 'detached HEAD' state:
Avoid checking out specific commits or tags directly. So the git HEAD reference always points to a branch.
Perform merge operations by first checking out the target branch and then merging changes from the source branch:
```
$ git checkout target-branch
$ git merge source-branch
```
Merge conflicts must be solved carefully, ensuring the working or the newest changes are included. Then changes staged (git add) and committed.
