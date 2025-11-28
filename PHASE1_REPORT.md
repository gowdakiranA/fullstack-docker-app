# Docker Project — Phase 1 Report
**Date:** 2025-11-28 06:42:20
## Overview
This document captures the initial (Phase 1) setup for containerizing and preparing deployment of a full-stack application (Angular frontend, Node/Express backend, MongoDB database) behind an Nginx reverse proxy, with Docker Compose orchestration.
## Initial State (Before Phase 1)
- **Repository**: `fullstack-docker-app` created on GitHub, cloned locally.
- **Backend** (Node/Express/Mongoose):
  - `server.js` existed but listened on default (localhost:8080) and did not expose a health endpoint.
  - `package.json` did **not** include a `start` script.
  - Mongo connection referenced `./app/models` (with `db.url`).
- **Frontend**: Existing **Angular** project (`angular.json`, `tsconfig` files present).
- **Nginx**: No configuration present.
- **Docker**: Not installed locally; no Dockerfiles present.
## Changes Implemented in Phase 1
### 1) Backend (Node/Express)
- **`server.js` updated** to:
  - Listen on `0.0.0.0` at **port 4000** (container-friendly).
  - Add **health endpoint** at `/api/health` returning `{ status: 'ok' }`.
  - Keep existing MongoDB connection logic.
- **`package.json` updated** to add:
    {"scripts": {"start": "node server.js", "test": "echo "Error: no test specified" && exit 1"}}
- **Backend Dockerfile** created at `backend/Dockerfile`:
    FROM node:20-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --only=production || npm install --only=production
    COPY . .
    ENV NODE_ENV=production
    EXPOSE 4000
    CMD ["npm", "start"]
- **Backend .dockerignore** created at `backend/.dockerignore`:
    node_modules
    npm-debug.log*
    yarn-error.log*
    .env
    dist
    build
    .DS_Store
### 2) Frontend (Angular)
- **Frontend Dockerfile** created at `frontend/Dockerfile` (Angular build & Nginx serve):
    FROM node:20-alpine AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci || npm install
    COPY . .
    RUN npm run build -- --configuration=production || npm run build

    FROM nginx:alpine
    COPY --from=build /app/dist/* /usr/share/nginx/html
    RUN sed -i 's/listen       80;/listen 3000;/' /etc/nginx/conf.d/default.conf
    EXPOSE 3000
    CMD ["nginx", "-g", "daemon off;"]
- **Frontend .dockerignore** created at `frontend/.dockerignore`:
    node_modules
    npm-debug.log*
    yarn-error.log*
    .env
    dist
    .DS_Store
    coverage
    .tmp
### 3) Nginx Reverse Proxy
- **Nginx config** created at `nginx/default.conf`:
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade $http_upgrade;
            proxy_set_header   Connection "upgrade";
            proxy_set_header   Host $host;
        }

        location /api/ {
            proxy_pass http://backend:4000/;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade $http_upgrade;
            proxy_set_header   Connection "upgrade";
            proxy_set_header   Host $host;
        }
    }
### 4) Docker Compose Orchestration
- **`docker-compose.yml`** created at repo root:
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
        build: ./frontend
        container_name: myapp-frontend
        restart: always
        networks:
          - app-net

      backend:
        build: ./backend
        container_name: myapp-backend
        restart: always
        environment:
          - NODE_ENV=production
          - MONGO_URI=mongodb://mongo:27017/myapp
        networks:
          - app-net

      mongo:
        image: mongo:6
        container_name: myapp-mongo
        restart: always
        volumes:
          - mongo_data:/data/db
        networks:
          - app-net

    networks:
      app-net:

    volumes:
      mongo_data:
## Current Repository Structure
```
fullstack-docker-app/
├─ backend/
│  ├─ Dockerfile
│  ├─ .dockerignore
│  ├─ package.json
│  └─ server.js
├─ frontend/
│  ├─ Dockerfile
│  ├─ .dockerignore
│  ├─ angular.json
│  ├─ package.json
│  └─ src/
├─ nginx/
│  └─ default.conf
└─ docker-compose.yml
```
## Notes & Considerations
- **Backend port** standardized to **4000**; Nginx proxies `/api/` to this port.
- **Frontend** served by its own Nginx on **3000**; reverse proxy exposes everything on **port 80**.
- **MongoDB** uses official Docker image; backend connects with `MONGO_URI=mongodb://mongo:27017/myapp`.
- Ensure backend reads `process.env.MONGO_URI`.
- Local Docker build deferred—will build on EC2.
## Phase 1 Outcomes
- Frontend and backend containerized.
- Nginx reverse proxy configured.
- Docker Compose stack defined.
- Repo ready for EC2 deployment.
## Next Steps (Phase 2 Plan)
1. Provision EC2 (Ubuntu 22.04) and open ports 80 and 22.
2. Install Docker & Compose on EC2.
3. Clone repo on EC2 and run `docker compose up -d --build`.
4. Test `http://<EC2_PUBLIC_IP>/` and `/api/health`.
5. Plan CI/CD with GitHub Actions.
## Change Log
- Added `start` script to backend `package.json`.
- Modified `server.js` to listen on `0.0.0.0:4000`; added `/api/health`.
- Created backend Dockerfile and .dockerignore.
- Created Angular frontend Dockerfile and .dockerignore.
- Added Nginx reverse proxy config.
- Added docker-compose.yml.

---
*Prepared for: Kiran Kumar A (Phase 1 — Containerization & Reverse Proxy setup)*
