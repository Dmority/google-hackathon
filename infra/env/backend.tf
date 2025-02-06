terraform {
  backend "gcs" {
    bucket = "tfstate-handson-446606"
    prefix = "infra.json"
  }
}
