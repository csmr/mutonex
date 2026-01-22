variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "server_type" {
  description = "Hetzner Server Type"
  type        = string
  default     = "cpx21"
}

variable "location" {
  description = "Hetzner Data Center Location"
  type        = string
  default     = "fsn1"
}
