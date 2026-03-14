# Resource Organization Philosophy

## Core Concerns
Mutonex distinguishes between two primary types of scripts:
1. **Game Development & Infrastructure**: Scripts that manage the development environment, build pipeline, and project meta-information.
2. **Game Content**: Scripts that generate, transform, or fetch game-specific assets and data.

## Recommendations

### 1. Location of Scripts
- **Infrastructure Scripts**: Stay in `src/scripts/`. Examples: `devenv.sh`, `bundle-webclient.sh`, `generate-api-key.js`, `make-credits.js`.
- **Content Scripts**: Reside in `src/res/scripts/`. Examples: `build_entity_models.ts`, `convertLocaleToUnitFactions.js`.
- **Specialized Data Scripts**: Scripts tightly coupled with specific data formats (like GeoTIFF processing) may remain in their respective data subdirectories (e.g., `src/res/geodata/`).

### 2. Output and Versioning
- **Source of Truth**: Generator scripts are considered source code and are always versioned.
- **Generated Assets**: Small, derived assets (like JSON models or YAML configs) are versioned under `src/res/` for developer accessibility.
- **Large Assets**: Large data (e.g., gigabytes of terrain data) should NOT be versioned. Instead, use a "fetch/bootstrap" script in the relevant `res/` directory to pull them from external storage.

### 3. Accessibility
Developers cloning the repo should have immediate access to a "test-driveable" game state. This is achieved by including versioned, pre-generated small assets and providing clear scripts for generating or fetching larger content.
