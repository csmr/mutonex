# Stippling & Sector Unit Spawning

This document details the spatial stippling algorithm used in
Mutonex for distributing fauna units, buildings, and mineral
resources across sector spaces.

## Overview

Naive random placement causes overlapping entities (such as trees
or buildings occupying the exact same position).
To guarantee a natural distribution with a minimum distance
$r$ between entities, Mutonex implements Bridson's Poisson disk
sampling algorithm with 2D parental cone optimization.

## Algorithm Details

1. **Spatial Grid**:
   - The ground plane $(X, Z)$ is split into grid cells of side
     length $w = r / \sqrt{2}$.
   - Each grid cell contains at most one point, enabling $O(1)$
     collision detection against surrounding cells.

2. **Active List & Annulus Sampling**:
   - Starting from an initial seed point $p_0$, candidate points
     $q$ are sampled in the annulus of radius $[r, 2r)$ centered at
     an active point $p$.

3. **Parental Cone Optimization**:
   - When sampling around candidate point $p$ whose parent is
     $p_{parent}$, the angular cone facing $p_{parent}$ is
     excluded.
   - Shadow cone half-width $\beta$ is calculated as:
     $$\beta = \min\left(
     \arccos\left(\frac{d^2 + 3r^2}{4r \cdot d}\right),
     \arccos\left(\frac{d}{2r}\right)
     \right)$$
   - Angles $\theta$ are sampled outside the excluded cone range
     $[\alpha - \beta, \alpha + \beta]$, reducing invalid sampling
     attempts and accelerating convergence.

4. **Terrain Elevation Snapping**:
   - Points are generated on the ground plane $(X, Z)$.
   - Elevation $Y$ is snapped to the sector surface height via
     `Mutonex.Engine.TerrainGenerator.sample_elevation/3`.

## Architecture & Integration

- **Module**: `Mutonex.Engine.Stippling`
- **Fauna Spawning**: `Mutonex.Engine.FaunaBehavior.spawn/3`
- **Resource Placement**: `Mutonex.Engine.Mineral.spawn_minerals/2`
