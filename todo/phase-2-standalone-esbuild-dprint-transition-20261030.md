# Phase 2: Standalone esbuild & dprint Transition Plan

## Context & Timeline
The Deno team is joining Cloudflare. Deno Deploy shuts down in
~6 months (around April 2027), and the runtime receives monthly
bug and security fixes for one more year (~October 2027), after
which official development ends. This project does not use
Deno Deploy. Phase 2 should be executed in Q1 2027.

## 1. Overview
Transition webclient bundling, content generation, unit
testing, and formatting from Deno to standalone esbuild, standard
Node.js APIs, and dprint.

## 2. Execution Steps

### 2.1 Builder Container (`infra/compose.yaml`)
- Update `webclient_builder` image from `denoland/deno:2.5.6` to
  `node:24-slim`.
- Rename container `mutondeno` to `mutonbuilder`.
- Execute pinned esbuild CLI directly:
  `npx --yes esbuild@0.24.0 core/main.ts --bundle`
  `--outfile=../dist/web.js` with `--define:__DEV_MODE_ENABLED__`
  and `--external` CDN flags.

### 2.2 Content Generation Scripts
- Port helper scripts from Deno runtime APIs (`Deno.*`) to
  vanilla Node.js `node:fs` and `node:path` modules without npm
  packages:
  - `webclient/generate-api-key.js`
  - `webclient/make-credits.js`
  - `webclient/generate_geojson.ts`
  - `content/res/scripts/build_entity_models.ts`

#### Deno to Node API Mapping Table

| Deno API | Node equivalent |
| --- | --- |
| `Deno.cwd()` | `process.cwd()` |
| `Deno.readTextFileSync(p)` | `fs.readFileSync(p, "utf8")` |
| `Deno.writeTextFileSync(p, s)` | `fs.writeFileSync(p, s)` |
| `Deno.readTextFile` | `fs.promises.readFile(p, "utf8")` |
| `Deno.writeTextFile` | `fs.promises.writeFile(p, s)` |
| `Deno.mkdir` | `fs.promises.mkdir(p, {rec:true})` |
| `std/path` imports | `import { join } from "node:path"` |
| `std/...` imports | `node:path` / `node:util` |

#### Porting Notes
- Node 24 runs `.ts` files natively (type stripping) without
  extra tools (`tsx`/`tsc`).
- Relative imports in TS scripts drop file extensions on Node.
- `import.meta.url` ports to `import.meta.dirname` or
  `process.cwd()`.
- Scripts run in container or locally via Node without extra
  dev tool installs.

### 2.3 Unit Testing (`webclient/tests/`)
- Port `webclient/tests/test.sh` and test files from `Deno.test`
  to Node.js built-in test runner (`node --test`).

### 2.4 Code Formatting (`dprint`)
- Create `webclient/dprint.json` matching current `deno.json`
  format rules (`lineWidth: 68`, `semiColons: "prefer"`,
  `quoteStyle: "preferSingle"`, `trailingCommas: "onlyMultiLine"`).
- Include TypeScript, JSON, and Markdown WASM plugins.
- Update `scripts/format_doc.sh` to execute `dprint fmt` or
  `dprint check`.

### 2.5 Obsolete File Cleanup
- Delete `webclient/deno.json` completely.
- Remove remaining functional references to Deno in repo docs
  and scripts.
