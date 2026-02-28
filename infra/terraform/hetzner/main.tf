# Hetzner Cloud Server
resource "hcloud_server" "mutonex" {
  name        = "mutonex-prod"
  image       = "ubuntu-22.04"
  server_type = var.server_type
  location    = var.location

  # Install Docker via cloud-init
  user_data = <<-EOT
    #cloud-config
    packages:
      - docker.io
      - docker-compose
    runcmd:
      - systemctl enable docker
      - systemctl start docker
  EOT
}
