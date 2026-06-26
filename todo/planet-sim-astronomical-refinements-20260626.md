# Planet Sim Astronomical Refinements

**Date:** 2026-06-26
**Status:** Planning
**Target Module:** `Mutonex.Simtellus.Planet`

## Objective
Upgrade existing first-order trigonometric approximations in
`planet.ex` to standard high-precision astronomical algorithms.

## Tasks
- [ ] **Update Solar Constant:**
  - Re-evaluate `@solar_constant` (currently 1367 W/m²).
  - Update to modern value (~1361 W/m²).
- [ ] **Refine `orbital_effect/1`:**
  - Replace simple cosine with eccentricity-based expansion for
    Earth-Sun distance.
- [ ] **Refine `declination_angle/1`:**
  - Implement higher-precision formula (e.g., Spencer, 1971 or
    Bourges, 1985) to replace the current simple cosine.
- [ ] **Implement Dynamic `solar_cycle/1`:**
  - Replace the hardcoded `0.999` with a periodic function
    representing the ~11-year Schwabe cycle.
- [ ] **Optimization:**
  - Verify that day-constant and hour-constant calculations are
    lifted out of per-sector simulation loops (e.g., in
    `irradiance_daily_wm2/2`).

## References
- Spencer, J. W. (1971). "Fourier series representation of the
  position of the sun."
- Bourges, B. (1985). "Improvement in solar declination
  computation."
