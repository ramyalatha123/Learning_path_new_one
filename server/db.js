// Import pg package
const { Pool } = require('pg');
require('dotenv').config(); // Loads environment variables from .env (for local use)

// Configure the database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learningpath_db',
  password: process.env.DB_PASSWORD || 'ramya',
  port: process.env.DB_PORT || 5433,
});


// SQL queries to create tables
const createTablesQuery = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'learner'
);

-- Learning Paths table
CREATE TABLE IF NOT EXISTS LearningPaths (
  id SERIAL PRIMARY KEY,
  creator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(255),
  short_description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE LearningPaths ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
-- Resources table
CREATE TABLE IF NOT EXISTS Resources (
  id SERIAL PRIMARY KEY,
  path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'video',
  title VARCHAR(255) NOT NULL,
  url TEXT,
  description TEXT,
  estimated_time INT DEFAULT 0,
  "order" INT DEFAULT 0
);

-- Apply schema updates (safe for reruns)
ALTER TABLE LearningPaths ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
ALTER TABLE LearningPaths ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE Resources ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'video';
ALTER TABLE Resources ALTER COLUMN url DROP NOT NULL;
ALTER TABLE Resources ADD COLUMN IF NOT EXISTS "order" INT DEFAULT 0;

-- Learner Resources table
CREATE TABLE IF NOT EXISTS LearnerResources (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id INT NOT NULL REFERENCES Resources(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(learner_id, resource_id)
);

-- Learner Path Enrollments
CREATE TABLE IF NOT EXISTS LearnerLearningPaths (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(learner_id, path_id)
);

-- Learner Progress
CREATE TABLE IF NOT EXISTS LearnerProgress (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL,
  resource_id INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(learner_id, resource_id)
);

-- Quiz Tables
CREATE TABLE IF NOT EXISTS Questions (
  id SERIAL PRIMARY KEY,
  resource_id INT NOT NULL,
  question_text TEXT NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES Resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Options (
  id SERIAL PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS Certificates (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
    issue_date TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, path_id) -- Prevent duplicate certificates for same user/path
  );
`;

// Function to create tables
const createTables = async () => {
  try {
    await pool.query(createTablesQuery);
    console.log('✅ Tables created successfully (if they did not exist)!');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  }
};

module.exports = {
  pool,
  createTables,
};
