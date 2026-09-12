# DEVELOPMENT_GUIDE.md: AI Agent Workflow Playbook

Succinct guide for LLM agents developing Mutonex features.

## I. Discovery & Environment Setup
1. Read `.agents/AGENTS.md` for codebase guidelines (<11
   lines/function, <68 chars/line, functional style).
2. Execute `.agents/agent_setup.sh` via `run_in_bash_session`.
3. Export PATH explicitly in all subsequent bash calls.
4. Read `todo/PROJECT_TRACKING.md` and `docs/` specifications.

## II. Planning & Tool Parsing
1. Call `request_plan_review` before calling `set_plan`.
2. Use numbered lists without Markdown headers inside `set_plan`.
3. Use exact phrasing for pre-commit step:
   "Complete pre-commit steps to ensure proper testing,
   verification, review, and reflection are done."

## III. Implementation & Verification
1. Read modified files immediately after editing to verify diffs.
2. Run unit test suites after changes:
   - Gameserver: `bash .agents/test_gameserver.sh`
   - Webclient: `bash .agents/test_webclient.sh`
3. Run `bash scripts/format_doc.sh` to check formatting.

## IV. Multi-Branch Consolidation
1. Run `git fetch --all` to inspect parallel feature branches.
2. Merge feature branches sequentially (`git merge --no-edit`).
3. Re-run both test suites to verify combined build.

## V. Documentation & Memory Recording
1. Update `todo/PROJECT_TRACKING.md` on task completion.
2. Separate active TODOs from completed items in TODO docs.
3. Move completed TODO files to `todo/archive/`.
4. Call `initiate_memory_recording` during pre-commit steps.
