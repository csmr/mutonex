# Feature: Automated Web Game Guide Generator
**Date:** 2026-03-06

## 1. Requirement
As per GDD Section 11, we need a "Web Game Guide"
generated from the source code's parameters.

## 2. Technical Strategy (AGENTS.md)
*   **Source of Truth:** Game parameters in data-driven
    config (e.g., `Mutonex.Engine.Rules`).
    **Runtime plan:** Look into if the Game Guide
    would be best generated using Elixir or Deno
    platform.
*   **Generation:** Build-time script (Deno) parses
    params and renders to template.
*   **Accessibility:** Integrated into web client,
    conforming to WCAG 2.1.

## 3. Initial Solution Design
1.  **Extraction:** Create `Mutonex.Engine.Rules` for
    constants (speeds, sight). Export to JSON.
2.  **Template:** Use `webclient/generate_guide.ts`
    to render parameters to HTML.
3.  **Integration:** Serve at `/guide` via Phoenix
    or embed in SPA.

## 4. Implementation Steps
- [ ] Abstract constants into centralized rules module.
- [ ] Create JSON exporter for rules.
- [ ] Design Guide UI (matching GDD Feature Cards).
- [ ] Implement build-time generation script.
- [ ] Add `/guide` route to Phoenix.
