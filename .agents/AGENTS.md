# AGENTS.md: Development Guidelines for AI Agents

Mutonex implementation strives to reach standard of secure,  pragmatic, succinct and accessible.

Mutonex is implemented with a functional style where possible, using Elixir, Ruby, and Deno JavaScript interpreters. For development and hosting purposes, each Mutonex component runs in a container defined in `compose.yaml`.

The implementation minimizes coupling between modules and especially seeks to minimize coupling and dependencies in test scripts, which should be standalone and exist for each module.

## Code format
1. Functional style code, mix-ins, modules.
2. One thing functions, limit blocks to >11 lines.
3. Expressions formatted one thing per line.
4. Lines as short as possible (60 chars).
5. Don't repeat yourself.

## Getting Started

To set up your development environment, run the following script:

```bash
src/scripts/agent_setup.sh
```

This will install all the necessary dependencies and start the required services.

## Running Tests

To run the tests for the `gameserver`, navigate to the `src/gameserver` directory and run the following command:

```bash
mix test
```
