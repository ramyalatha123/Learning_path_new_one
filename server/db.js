const { Pool } = require('pg');

// Configure the database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'learningpath_db',
  password: 'ramya',
  port: 5433,
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
  creator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- FIX: Changed to lowercase 'users'
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(255),    -- ADDED
  short_description TEXT, -- ADDED
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resources table
CREATE TABLE IF NOT EXISTS Resources (
  id SERIAL PRIMARY KEY,
  path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'video', -- ADDED
  title VARCHAR(255) NOT NULL,
  url TEXT, -- FIX: Removed 'NOT NULL' (quizzes have no URL)
  description TEXT,
  estimated_time INT DEFAULT 0
);

-- --- FIX: ADD COMMANDS TO UPDATE YOUR OLD TABLES ---
ALTER TABLE LearningPaths ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
ALTER TABLE LearningPaths ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE Resources ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'video';
ALTER TABLE Resources ALTER COLUMN url DROP NOT NULL;
-- --- END OF FIX ---


-- Learner Resources table (This table is not used, but is OK to keep)
CREATE TABLE IF NOT EXISTS LearnerResources (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- FIX: Changed to lowercase 'users'
  resource_id INT NOT NULL REFERENCES Resources(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(learner_id, resource_id)
);

-- Learner Path Enrollments
CREATE TABLE IF NOT EXISTS LearnerLearningPaths (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- FIX: Changed to lowercase 'users'
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
`;

// Function to create tables
const createTables = async () => {
  try {
    await pool.query(createTablesQuery);
    console.log('Tables created successfully (if they did not exist)!');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

module.exports = {
  pool,
  createTables,
};