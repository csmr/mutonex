# Mutonex Infrastructure

Infrastructure as Code for the Mutonex game project.

## Overview
<pre>
infra
├── compose.yaml    # app container services
├── conf            # for production nginx reverse proxy
├── data            # game data, a postgres cluster
├── terraform       # hosting provisions
└── README.md
</pre>

## Persistence

The `data/` dir contains postgres configuration and data. On postgres
container startup, `data/.env.postgres` with credentials and `data/postgres/`
are created.

Note: if `data/` is wiped, dot-env credential accounts, user, game and sim 
data is lost.

## Hosting Configurations

### GCP
- `./terraform/gcp/`
- **Services**: Provisions a GKE Autopilot cluster.
- **Hosting**: Managed Kubernetes for multi-container apps.
- **Pragmatic Level**: High (managed control plane).

### Hetzner 
- `./terraform/hetzner/`
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

