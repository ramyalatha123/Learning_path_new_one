# --- Backend Dockerfile (server/Dockerfile) ---

# 1. Base Image
FROM node:18-alpine AS base

# 2. Set working directory FIRST
WORKDIR /app 

# 3. Copy package files to the WORKDIR
COPY server/package*.json ./

# 4. Install production dependencies
RUN npm ci --only=production

# 5. Copy the rest of your server code into a 'server' subdirectory (or directly into /app if preferred)
# Option A: Copy into /app/server (matches original WORKDIR logic)
# WORKDIR /app/server # Set this if your code expects it
# COPY server/. . 

# Option B (Simpler): Copy directly into /app
WORKDIR /app # Stay in /app
COPY . . # Copy server contents directly into /app

# 6. Expose the port
EXPOSE 5000

# 7. Define the start command (relative to WORKDIR /app)
CMD ["node", "index.js"]