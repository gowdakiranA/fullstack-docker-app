# frontend/Dockerfile (Angular)
FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci || npm install

# Copy source
COPY . .

# Build Angular for production (adjust if your script differs)
RUN npm run build -- --configuration=production || npm run build

# Serve built static files via Nginx
FROM nginx:alpine
# Copy the built dist output. If your dist dir is named, this wildcard still works.
COPY --from=build /app/dist/* /usr/share/nginx/html
# Serve static files on port 3000 in the container (we'll reverse-proxy to this)
RUN sed -i 's/listen       80;/listen 3000;/' /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
