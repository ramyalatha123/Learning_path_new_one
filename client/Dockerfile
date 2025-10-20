# --- Frontend Dockerfile (client/Dockerfile) ---

# --- Stage 1: Build the React App ---
FROM node:18-alpine AS builder

# Set working directory for the build stage
WORKDIR /app/client

# Copy package files
COPY package*.json ./

# Install dependencies (use --legacy-peer-deps if needed for react-beautiful-dnd)
RUN npm install --legacy-peer-deps

# Copy the rest of the client application code
COPY . .

# Build the production-ready static files
# Output will be in the /app/client/build folder
RUN npm run build

# --- Stage 2: Serve the built app with Nginx ---
FROM nginx:stable-alpine

# Copy the built static files from the 'builder' stage to Nginx's web root
COPY --from=builder /app/client/build /usr/share/nginx/html

# Copy a custom Nginx configuration file (we'll create this next)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP port Nginx listens on)
EXPOSE 80

# Command to start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]