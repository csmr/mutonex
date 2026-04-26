# Mutonex Infrastructure

Infrastructure as Code for the Mutonex game project.

## Overview

This directory manages the hosting environments for:
- **Webserver**: (Phoenix) Handles accounts and Auth.
- **Database**: (Postgres) Persistent user data.
- **Gameserver**: (Websockets) Real-time state and geometry.
- **Nginx**: Production-grade reverse proxy.

The application services are defined in `src/compose.yaml`.

## Hosting Configurations

### GCP (`terraform/gcp/`)
Targeted for GCP Engineer certification studies.
- **Services**: Provisions a GKE Autopilot cluster.
- **Hosting**: Managed Kubernetes for multi-container apps.
- **Pragmatic Level**: High (managed control plane).

### Hetzner (`terraform/hetzner/`)
Targeted for cost-effective, hands-on production.
- **Services**: Provisions a Cloud VPS (CPX21).
- **Hosting**: Docker Compose on Ubuntu.
- **Pragmatic Level**: Extreme (direct control, low cost).

## Usage

Choose a provider directory and initialize:
```bash
cd terraform/<provider>
terraform init
terraform plan
```
