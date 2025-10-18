const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Notice '../' to go up one folder
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// === 1. REGISTER A NEW USER ===
// (POST /api/auth/register)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Check if user already exists
    const user = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Insert new user into database with dynamic role
    const newUser = await pool.query(
      'INSERT INTO Users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, passwordHash, role || 'learner'] // default to learner if role missing
    );

    // 4. Create JWT token
    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Send response with token and user info
    res.json({
      token,
      role: newUser.rows[0].role,
      id: newUser.rows[0].id,
      email: newUser.rows[0].email
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// === 2. LOGIN A USER ===
// (POST /api/auth/login)
// === 2. LOGIN A USER ===
// (POST /api/auth/login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const userQuery = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userQuery.rows[0];

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Send back token + user info
    res.json({
      token,
      role: user.role,
      id: user.id,
      email: user.email
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router; // Export the router