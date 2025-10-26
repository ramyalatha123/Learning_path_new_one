# BEFORE (Causes error because of inline comment):
# ENV POSTGRES_USER=postgres # We will use 'postgres' locally for simplicity

# AFTER (The Fix): Move the comment to its own line
# Use the official PostgreSQL image as the base
FROM postgres:14-alpine

# Set working directory (optional, but good practice)
WORKDIR /app

# Set environment variables for the database (same as docker-compose)
ENV POSTGRES_DB=learningpath_db
ENV POSTGRES_USER=postgres
# Line 7 used to have a comment, ensure it's clean now.
ENV POSTGRES_PASSWORD=ramya 

# Copy the initialization script (schema.sql) into the container's init directory
COPY schema.sql /docker-entrypoint-initdb.d/