# Planet Sim Solar Oblateness & Asphericities

**Date:** 2026-06-26
**Status:** Planning
**Target Module:** `Mutonex.Simtellus.Planet`

## Objective
Incorporate temporal variations in solar shape (oblateness) into
the planetary energy flux model based on recent astrophysical
research.

## Tasks
- [ ] **Implement `solar_oblateness/1`:**
  - Create function computing solar equatorial radius variation
    ($\Delta R_{eq}$).
  - Target displacement magnitudes of hundreds of kilometers
    due to magnetic and centrifugal forces.
  - Model the identified ~3-year lag relative to the solar
    activity cycle (Schwabe cycle).
- [ ] **Integrate with `solar_irradiance_wm2/1`:**
  - Map radius and asphericity variations to changes in
    effective solar constant or spectral distribution (UV influx).
  - Note: Solar bulge effects are statistically small relative
    to the 150-million-km distance but impact flux precision.
- [ ] **Multi-year Cycle Support:**
  - Ensure `solar_irradiance_wm2` can track simulation time
    beyond the 365-day cycle to account for long-term cycles.

## References
- Rozelot, J. P., et al. (2025). "Solar oblateness & asphericities
  temporal variations: outstanding some unsolved issues."
  [arXiv:2501.10821](https://arxiv.org/abs/2501.10821).
- Satellite data on solar oblateness pulsations and plasma
  displacements.
