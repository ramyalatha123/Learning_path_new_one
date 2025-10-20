# --- Backend Dockerfile (server/Dockerfile) ---

# 1. Base Image
FROM node:18-alpine AS base

# 2. Set working directory inside the container
WORKDIR /app

# 3. Copy ONLY package files first, FROM the server subfolder relative to the build context
COPY server/package*.json ./

# 4. Install production dependencies
RUN npm ci --only=production

# 5. Copy the rest of your server application code, FROM the server subfolder
COPY server/. .

# 6. Expose the port the server runs on
EXPOSE 5000

# 7. Define the command to start the server (still runs from /app)
CMD ["node", "index.js"]