# Gameplay Todo: Incomplete Fauna Voxel Models

## Issue
Several of the generated voxel geometry entity models do not represent the full fauna unit. Instead of generating a complete creature, the model only renders the head portion (e.g., the bull head or eagle/bird head).

## Impact
This breaks the visual immersion and consistency of the gameplay experience, as players expecting to see entire roaming fauna will only see floating disembodied heads rendered via the Lidar/Sphere views.

## Required Action
1. Audit the source character or prompt generation parameters that output these models.
2. Re-generate or locate full-body voxel representations for the affected fauna (bull, eagle, etc.).
3. Commit the repaired `.json` models into `src/res/entity_geometry/`.
4. Run `./scripts/build-webclient.sh` to update the distribution asset payload.
