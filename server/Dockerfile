# Use a Node base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files to install dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy all application code (index.js, routes, public/, etc.)
COPY . .

# Expose the port the server listens on
EXPOSE 5000

# Command to start the application
CMD ["node", "index.js"]