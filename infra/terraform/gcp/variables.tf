variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west3"
}

variable "cluster_name" {
  description = "GKE Cluster Name"
  type        = string
  default     = "mutonex-cluster"
}
