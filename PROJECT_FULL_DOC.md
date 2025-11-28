
# Full Project Documentation — Docker, Compose, CI/CD & Deployment (Angular + Node + MongoDB + Nginx)

**Date:** 2025-11-28

This document aggregates **all Dockerfiles**, the **Docker Compose** configuration, the **complete CI/CD workflow**, and a comprehensive **README** with step-by-step setup, deployment instructions, and screenshot placeholders for:
- CI/CD configuration and execution
- Docker image build & push
- Application deployment & UI working
- Nginx setup & infrastructure details

---

## 1) Repository Structure

```
fullstack-docker-app/
├─ backend/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ server.js
├─ frontend/
│  ├─ Dockerfile
│  ├─ package.json
│  ├─ angular.json
│  └─ src/
├─ nginx/
│  └─ default.conf
├─ docker-compose.yml
├─ .env (not committed; use .env.example)
└─ .github/workflows/
   └─ deploy.yml
```

---

## 2) Dockerfiles (complete)

### 2.1 Backend `backend/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production
COPY . .
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["npm", "start"]
```

### 2.2 Frontend (Angular) `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
# Build Angular for production
RUN npm run build -- --configuration=production || npm run build

# Serve built files via Nginx inside the frontend container on port 3000
FROM nginx:alpine
COPY --from=build /app/dist/* /usr/share/nginx/html
RUN sed -i 's/listen 80;/listen 3000;/' /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### 2.3 Nginx Reverse Proxy `nginx/default.conf`
```nginx
server {
    listen 80;
    server_name _;

    # Frontend (Angular build served by its own nginx on port 3000)
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
    }

    # Backend API (Node/Express on port 4000)
    location /api/ {
        # Important: no trailing slash to preserve /api prefix
        proxy_pass http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
    }
}
```

---

## 3) Docker Compose `docker-compose.yml`

> Production: uses images from Docker Hub via `${DOCKERHUB_USERNAME}` and environment variables via `.env`.

```yaml
version: "3.8"
services:
  nginx:
    image: nginx:alpine
    container_name: myapp-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-net

  frontend:
    image: ${DOCKERHUB_USERNAME}/fullstack-frontend:latest
    container_name: myapp-frontend
    restart: always
    networks:
      - app-net

  backend:
    image: ${DOCKERHUB_USERNAME}/fullstack-backend:latest
    container_name: myapp-backend
    restart: always
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
    networks:
      - app-net

  mongo:
    image: mongo:6
    container_name: myapp-mongo
    restart: always
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_INITDB_ROOT_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_INITDB_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db
    networks:
      - app-net

networks:
  app-net:

volumes:
  mongo_data:
```

---

## 4) CI/CD Workflow `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy to EC2

on:
  push:
    branches: ["main"]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build & push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/fullstack-backend:latest

      - name: Build & push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/fullstack-frontend:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Copy files to EC2
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VM_SSH_HOST }}
          username: ${{ secrets.VM_SSH_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          source: "docker-compose.yml,nginx/default.conf"
          target: "/opt/myapp"

      - name: Deploy on EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_SSH_HOST }}
          username: ${{ secrets.VM_SSH_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            set -e
            cd /opt/myapp
            echo "${{ secrets.DOCKERHUB_TOKEN }}" | docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
            docker compose pull
            docker compose up -d --remove-orphans
            docker system prune -f
```

---

## 5) README — Step-by-step Setup & Deployment

### 5.1 Prerequisites
- GitHub repo: `fullstack-docker-app`
- Docker Hub account with repositories:
  - `fullstack-frontend`
  - `fullstack-backend`
- AWS EC2 Ubuntu 22.04 LTS (open ports **22** and **80**)

### 5.2 Environment Variables
Create `.env` in repo root (not committed) and on EC2:
```dotenv
DOCKERHUB_USERNAME=yourdockerhubuser
MONGO_DB=myapp
MONGO_INITDB_ROOT_USERNAME=appuser
MONGO_INITDB_ROOT_PASSWORD=StrongPassword123
MONGO_URI=mongodb://appuser:StrongPassword123@mongo:27017/myapp?authSource=admin
```
Add `.env` to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

### 5.3 EC2 Preparation
```bash
# SSH into EC2
ssh -i /path/to/key.pem ubuntu@<EC2_PUBLIC_IP>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
sudo apt-get install docker-compose-plugin -y

# Prepare app directory
sudo mkdir -p /opt/myapp
sudo chown $USER:$USER /opt/myapp
```

### 5.4 First Deployment (manual)
```bash
# On EC2
cd /opt/myapp
# Copy repo or let CI do it; for manual test:
git clone https://github.com/<your-username>/fullstack-docker-app.git .
# Place .env
nano .env
# Start stack
docker compose up -d --pull always
```

Open:
- `http://<EC2_PUBLIC_IP>/` → Frontend
- `http://<EC2_PUBLIC_IP>/api/health` → API health

### 5.5 Fix for Nginx API Proxy
Ensure the `/api` location uses `proxy_pass http://backend:4000;` (no trailing slash) to preserve prefix.

### 5.6 CI/CD Setup (GitHub Actions)
Add **repository secrets**:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (Docker Hub access token)
- `VM_SSH_HOST` (EC2 public IP)
- `VM_SSH_USER` (e.g., `ubuntu`)
- `VM_SSH_KEY` (private SSH key contents in PEM/OpenSSH format)

Trigger pipeline by pushing to `main` or from the **Actions** tab.

### 5.7 Verification
- Check **Actions** run → build & push images → deploy to EC2
- On EC2: `docker ps`, `docker compose logs nginx`, `curl http://localhost/api/health`

### 5.8 Rollback & Versioning (recommended)
- Tag images with commit SHA:
```yaml
# Example tags in build-push steps
with:
  tags: |
    ${{ secrets.DOCKERHUB_USERNAME }}/fullstack-backend:latest
    ${{ secrets.DOCKERHUB_USERNAME }}/fullstack-backend:sha-${{ github.sha }}
```
- Roll back by pinning compose to a previous tag and redeploy.

### 5.9 HTTPS (optional)
- Attach a domain → get certs (e.g., via Let’s Encrypt) → mount certs in reverse proxy → update nginx server blocks to `listen 443 ssl;`.

### 5.10 Monitoring & Hardening (optional)
- Enable `restart: always` (already set for app containers)
- Use CloudWatch/Prometheus + Grafana
- Restrict SG to required IPs, rotate tokens, limit SSH via key only

---

## 6) Screenshots (Placeholders)
Add the following screenshots to `docs/screenshots/` and reference them here:

1. **CI/CD configuration (GitHub Actions Secrets & Workflow)**
   - `docs/screenshots/actions-secrets.png`
   - `docs/screenshots/workflow-run.png`

2. **Docker image build and push process**
   - `docs/screenshots/dockerhub-frontend.png`
   - `docs/screenshots/dockerhub-backend.png`

3. **Application deployment & working UI**
   - `docs/screenshots/ui-home.png`
   - `docs/screenshots/api-health.png`

4. **Nginx setup & infrastructure details**
   - `docs/screenshots/nginx-conf.png`
   - `docs/screenshots/compose-services.png`

Usage in README:
```markdown
![Actions Secrets](docs/screenshots/actions-secrets.png)
![Workflow Run](docs/screenshots/workflow-run.png)
![DockerHub Frontend](docs/screenshots/dockerhub-frontend.png)
![DockerHub Backend](docs/screenshots/dockerhub-backend.png)
![UI Home](docs/screenshots/ui-home.png)
![API Health](docs/screenshots/api-health.png)
![Nginx Conf](docs/screenshots/nginx-conf.png)
![Compose Services](docs/screenshots/compose-services.png)
```

---

## 7) How to Push This Document to the Repo
```bash
# Save this file as PROJECT_FULL_DOC.md in your repo root
# If you are on your local machine
cd fullstack-docker-app
# Move the file into the repo
mv /path/to/PROJECT_FULL_DOC.md ./
# Add, commit, push
git add PROJECT_FULL_DOC.md
git commit -m "Add full project documentation (Docker, Compose, CI/CD, README & screenshots)"
git push origin main
```

---

## 8) Quick Troubleshooting
- **`cannot GET /health`** → Ensure `/api/` proxy uses `proxy_pass http://backend:4000;` (no trailing slash).
- **Images not updating** → Check Actions logs; verify `docker compose pull` runs on EC2 and the tags match.
- **Mongo auth issues** → Confirm `MONGO_URI` uses correct creds and `authSource=admin`.

---

**Prepared for:** Kiran Kumar A (Engineer - Cloud & Infra Management)
