# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests and install only production deps
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

# Copy the application source
COPY . .

# Runtime settings
ENV NODE_ENV=production
EXPOSE 4000

# Start via package.json's "start" script
CMD ["npm", "start"]
