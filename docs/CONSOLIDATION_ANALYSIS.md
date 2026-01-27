# Mutonex Consolidation Analysis (2026-01-25)

## Overview
This document summarizes the analysis of 19+ branches developed since November 19th, 2025. The goal was to identify unmerged features, improvements, and dead ends to ensure a complete and functioning version in the `release-v0.2.x` branch.

## Branch Status Summary

| Branch | Status | Unmerged Improvements |
| :--- | :--- | :--- |
| `feat-merge-simtellus-port-...` | **Active / Target** | Baseline for Simtellus port and FaunaSystem. |
| `feat-infrastructure-setup-...` | **Partial Merge** | `infra/` folder (Terraform/GCP/Hetzner) is missing in target. |
| `merge-consolidation-...` | **Meta-Branch** | Identified architectural improvements. Missed `hash-utils.ts` and some `todo/` items. |
| `feat-lidar-view-...` | **Merged** | Core Lidar and Geometry logic is present. Missed `LOGICAL_INTEGRATION_REPORT.md`. |
| `feat-absorb-simtellus-...` | **Consolidated** | Ported to Elixir. Missed `game_module_consolidation_plan.md` and `master_design_doc.html`. |
| `geodata-prep-...` | **Partial Merge** | `slice_geodata.py` is missing in target. |
| `feat-account-plan-...` | **Partial Merge** | `todo/account_plan.md` is missing in target. |

## Unmerged Improvements to Port

### 1. Infrastructure and Tooling
- **Terraform Configs:** `infra/` directory containing GCP and Hetzner provisioning scripts.
- **Geodata Tools:** `src/res/geodata/slice_geodata.py` for advanced terrain processing.
- **Hashing Utilities:** `src/scripts/hash-utils.ts` for API key management.

### 2. Documentation and Project Tracking
- **Consolidation Plans:** `todo/game_module_consolidation_plan.md`, `todo/account_plan.md`.
- **Octree Review:** `todo/octree_review.md`.
- **Master Docs:** `agents_master.md`, `master_design_doc.html`.
- **Itineraries/Reports:** `LOGICAL_INTEGRATION_REPORT.md`, `COMPARISON_REPORT.md`, `REVIEW_OUTCOME.md`.

### 3. Architectural Cleanup
- **Endpoint vs Router:** Move `db_test`, `health_check`, and `serve_index` logic from `Mutonex.Net.Endpoint` plugs into `Mutonex.Net.Router` and appropriate controllers to reduce redundancy and follow Phoenix best practices.

## Dead Ends and Deprecated Logic
- **Ruby Simtellus:** Branches containing `src/simtellus` (Ruby) are considered deprecated by the Elixir port.
- **Deno Webserver:** The standalone `webserver` service is deprecated by the Phoenix static asset serving logic.
- **Inline Fauna Logic:** Old versions of `GameSession` with inline fauna movement are superseded by the `FaunaSystem` and `FaunaBehavior` modules.

## Recommendations for release-v0.2.x
1. **Port all unique files** listed above.
2. **Refactor Endpoint** to delegating routing of diagnostic and static endpoints to the Router where appropriate, or at least clean up the redundant `/db-test` vs `/api/db-test`.
3. **Verify Auth Plug:** While remaining a development stub, ensure it's positioned correctly in the pipeline.
