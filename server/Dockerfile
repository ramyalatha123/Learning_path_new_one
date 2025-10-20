# Use Node.js 18 as the base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all remaining server code
COPY . .

# Expose your backend port
EXPOSE 5000

# Start the Node.js server
CMD ["npm", "start"]
