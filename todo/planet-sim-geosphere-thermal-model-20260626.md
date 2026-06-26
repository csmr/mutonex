# Planet Sim Geosphere Thermal Model

**Date:** 2026-06-26
**Status:** Planning
**Target Module:** `Mutonex.Simtellus.Planet`

## Objective
Implement a geosphere thermal influx and ground heat model to
support realistic night-time cooling and geothermal anomalies.

## Tasks
- [ ] **Baseline Geothermal Flux:**
  - Implement a global static baseline for deep geothermal heat
    flux (target: $0.08 W/m^2$).
- [ ] **Geothermal Hotspots:**
  - Add support for dynamic spikes ($>1.0 W/m^2$) in volcanic
    or tectonic rift zones.
- [ ] **Shallow Ground Heat Flux ("Thermal Battery"):**
  - Model ground layers as a dynamic thermal battery that absorbs
    heat during daylight and releases it at night.
  - Implement **Thermal Sum** logic to track accumulated heat
    energy in the shallow crust.
- [ ] **Momentary Thermal Radiation:**
  - Implement a model for momentary thermal radiation enabling
    realistic atmospheric cooling cycles.

## References
- NCAR / Community Land Model (CLM) Documentation.
- JULES (Joint UK Land Environment Simulator).
- Earth System Modeling (ESM) literature on Ground Heat Flux.
