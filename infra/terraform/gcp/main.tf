# GKE Autopilot Cluster
# Simplest way to run multi-container apps on GCP
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  enable_autopilot = true

  # Networking
  network    = "default"
  subnetwork = "default"

  # Access for the game services
  ip_allocation_policy {
    cluster_ipv4_cidr_block  = ""
    services_ipv4_cidr_block = ""
  }
}
