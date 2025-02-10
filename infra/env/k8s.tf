variable "project_id" {
  description = "The project ID to host the cluster in"
  default     = "handson-446606"
}

data "google_project" "this" {
    project_id = var.project_id
}


resource "google_compute_network" "main" {
    name = "main"
    auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
    name          = "main"
    network       = google_compute_network.main.name
    ip_cidr_range = "192.168.1.0/24"
}

# NAT Gateway
resource "google_compute_router" "nat" {
  name    = "nat-router"
  network = google_compute_network.main.name

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "nat" {
  name                               = "nat"
  router                             = google_compute_router.nat.name
  region                             = google_compute_router.nat.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Service Account for GKE nodes
resource "google_service_account" "gke" {
  account_id   = "gke-service-account"
  display_name = "GKE Service Account"
}

# Grant necessary roles to the service account
resource "google_project_iam_member" "gke_roles" {
  project = var.project_id
  role    = "roles/container.nodeServiceAccount"
  member  = "serviceAccount:${google_service_account.gke.email}"
}
resource "google_project_iam_member" "ai_roles" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member   = "principal://iam.googleapis.com/projects/${data.google_project.this.number}/locations/global/workloadIdentityPools/${var.project_id}.svc.id.goog/subject/ns/default/sa/web-pods-service-account"
}

# Create GKE cluster
resource "google_container_cluster" "main" {
  name     = "hackathon-cluster"
  location = "asia-northeast1"

  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.main.name

  enable_autopilot = true
  networking_mode = "VPC_NATIVE"

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}

# Artivact Registry
resource "google_artifact_registry_repository" "app" {
  location      = "asia-northeast1"
  repository_id = "app"
  description   = "chat application"
  format        = "DOCKER"
}
