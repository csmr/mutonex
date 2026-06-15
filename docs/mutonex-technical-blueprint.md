# Mutonex Technical Blueprint

This document defines the architectural paradigm of the Mutonex.
It reflects the consolidated, high-performance BEAM infrastructure.

## Core System Architecture

Mutonex utilizes a unified infrastructure divided into three
primary components:

### 1. Elixir Phoenix Gameserver
The heart of Mutonex. The BEAM VM orchestrates concurrent
connections, world simulation, and real-time state broadcasts.
It is subdivided into three functional domains:

- **Net (Auth/WebSockets)**: Handles web routing, user auth,
  and persistent WebSocket channels via Phoenix. It is decoupled
  from the engine via the `Notifier` behavior.
- **Engine (Session/Octree State)**: Stateful domain using
  GenServers and `SparseOctree`. It manages session persistence
  and spatial indexing with O(1) leaf updates and squared-distance
  queries for high-frequency unit logistics.
- **Simtellus (Exoplanet Simulation)**: Pure-function mechanics
  governing orbital dynamics, ecosystem progression, and
  terrain geometry.

### 2. Bundler
Container-driven asset pipeline compiling optimized browser bundles.
- **Implementation**: `webclient_builder` container.
- **Technology**: Deno execution engine running `esbuild` tasks.
  Packages ES6+ JS, static assets, and CSS into the gameserver's
  static directory.

### 3. Browser Client
Front-end experience delivered through the browser.
- **Interface**: Vanilla JS/TS with Three.js for 3D rendering.
- **Connectivity**: Phoenix WebSocket channels, receiving
  succinct JSON tuples for real-time entity interpolation.

## Hosting & Infrastructure

Mutonex leverages declarative infrastructure-as-code:
- **GCP**: Scalable environments (GKE Autopilot) with managed
  control planes.
- **Hetzner**: Cost-effective self-managed stacks using
  `docker compose` on raw VMs.

## Security Posture & Hardening

Mutonex adheres to a defense-in-depth security philosophy:
- **Modular Isolation**: The `Notifier` abstraction and domain
  separation (Net, Engine, Simtellus) minimize the impact of a
  single-component compromise.
- **Environment Driven**: All sensitive parameters (salts, hashes,
  database credentials) are externalized to the environment to
  prevent source-code leaks.
- **Static Analysis**: The codebase is designed for compatibility
  with automated SAST tools like Sobelow to ensure standard web
  vulnerabilities are mitigated early in the lifecycle.
