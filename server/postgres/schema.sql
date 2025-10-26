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

-- Learner Resources table (You might use LearnerLearningPaths instead, but keeping this for completeness)
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

-- Certificates table
CREATE TABLE IF NOT EXISTS Certificates (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    path_id INT NOT NULL REFERENCES LearningPaths(id) ON DELETE CASCADE,
    issue_date TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, path_id)
);

-- OPTIONAL: Add initial test users and data here if you want them created automatically:
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@test.com', '$2a$10$HASHED_PASSWORD_HERE', 'admin');
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Creator Demo', 'creator@test.com', '$2a$10$HASHED_PASSWORD_HERE', 'creator');
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Learner Demo', 'learner@test.com', '$2a$10$HASHED_PASSWORD_HERE', 'learner');