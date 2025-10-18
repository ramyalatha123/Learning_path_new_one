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
  creator_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resources table
CREATE TABLE IF NOT EXISTS Resources (
  id SERIAL PRIMARY KEY,
  path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  estimated_time INT DEFAULT 0
);

-- Learner Resources table
CREATE TABLE IF NOT EXISTS LearnerResources (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  resource_id INT NOT NULL REFERENCES Resources(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(learner_id, resource_id)
);
CREATE TABLE IF NOT EXISTS LearnerLearningPaths (
  id SERIAL PRIMARY KEY,
  learner_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(learner_id, path_id)
);
CREATE TABLE IF NOT EXISTS LearnerProgress (
    id SERIAL PRIMARY KEY,
    learner_id INT NOT NULL,
    resource_id INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    UNIQUE(learner_id, resource_id)
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
