# Planet Sim Albedo & Surface Reflection Model

**Date:** 2026-06-26
**Status:** Planning
**Target Module:** `Mutonex.Simtellus.Planet`

## Objective
Implement a scientifically grounded surface reflection model
using Plant Functional Types (PFT) and Solar Zenith Angle (SZA)
corrections to replace raw pixel color mapping.

## Tasks
- [ ] **PFT Classification (Plant Functional Types):**
  - Define fixed surface classes: Water, Deep Forest, Grassland,
    Bare Sand, Snow.
  - Map satellite pixel ranges/biomes to these PFTs.
- [ ] **Linear Mixture Model:**
  - Compute sector-level albedo as a weighted average of PFT
    base albedos based on fractional cover.
- [ ] **Illumination Correction (SZA):**
  - Implement dynamic albedo modification based on the Solar
    Zenith Angle to account for increased reflection at glancing
    angles.
  - Formula: $Refl = Insol \times Albedo \times (1 / \cos(SZA))$.

## References
- NCAR / Community Land Model (CLM) Documentation.
- JULES (Joint UK Land Environment Simulator).
- NASA MODIS Albedo Product (MCD43A3) Algorithms.
