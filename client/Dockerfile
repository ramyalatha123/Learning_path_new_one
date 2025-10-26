# --- STAGE 1: BUILD THE REACT APPLICATION ---
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
COPY package-lock.json ./
# Use the legacy-peer-deps flag to avoid conflicts with react-beautiful-dnd
RUN npm install --legacy-peer-deps

# Copy source code and build the application
COPY . .
RUN npm run build

# --- STAGE 2: SERVE THE APPLICATION VIA NGINX ---
FROM nginx:alpine

# Copy the static build output from the build stage into Nginx's public directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 (standard HTTP port for Nginx)
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]