# Docker Project — Phase 2 & Phase 3 Report
**Date:** 2025-11-28

## Overview
This report summarizes the activities and outcomes of Phase 2 (Deployment on EC2) and Phase 3 (CI/CD Pipeline Setup) for the full-stack Dockerized application.

## Phase 2: EC2 Deployment Steps
- Provisioned EC2 instance (Ubuntu 22.04) with ports 22 (SSH) and 80 (HTTP) open.
- Installed Docker Engine and Docker Compose plugin on EC2.
- Cloned GitHub repository `fullstack-docker-app` into `/opt/myapp` on EC2.
- Ran `docker compose up -d --build` to start containers (frontend, backend, mongo, nginx).
- Verified application on `http://<EC2_PUBLIC_IP>/` and fixed Nginx proxy issue by removing trailing slash in `proxy_pass` for `/api/`.
- Confirmed API health endpoint works at `/api/health`.

## Phase 3: CI/CD Pipeline Setup Steps
- Created Docker Hub repositories for frontend and backend images.
- Tagged and pushed images to Docker Hub from EC2.
- Added GitHub Actions workflow (`.github/workflows/deploy.yml`) to automate CI/CD:
-   - Build and push Docker images on `main` branch push.
-   - SSH into EC2 and deploy updated containers using Docker Compose.
- Configured GitHub Secrets: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN, VM_SSH_HOST, VM_SSH_USER, VM_SSH_KEY.
- Updated `docker-compose.yml` to pull images from Docker Hub instead of local builds.
- Created `.env` file for environment variables and added `.gitignore` entry to secure secrets.
- Tested pipeline by pushing changes to `main` and verified automatic deployment on EC2.

## Outcomes
- Application successfully deployed on EC2 and accessible via port 80.
- CI/CD pipeline operational: builds images, pushes to Docker Hub, and redeploys on EC2.
- Environment variables centralized in `.env` for better security and maintainability.

## Next Recommendations
- Implement rollback strategy using image tags (e.g., commit SHA).
- Enable HTTPS with SSL certificates for production security.
- Add monitoring and alerting for container health.
- Consider auto-scaling and load balancing for high availability.