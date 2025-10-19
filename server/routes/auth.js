const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// === 1. REGISTER A NEW USER ===
// (POST /api/auth/register)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Check if user already exists
    // FIX: Use lowercase 'users' table
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Insert new user into database
    // FIX: Use lowercase 'users' table
    const userRole = role || 'learner';
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, passwordHash, userRole]
    );

    // 4. Create a JWT token
    const token = jwt.sign(
      { 
        id: newUser.rows[0].id, 
        role: newUser.rows[0].role,
        name: newUser.rows[0].name // Add name here
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Send token AND user info back (for AuthContext)
    res.status(201).json({
      token,
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        name: newUser.rows[0].name,
        role: newUser.rows[0].role
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// === 2. LOGIN A USER ===
// (POST /api/auth/login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    // FIX: Use lowercase 'users' table
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Create and send token (with name)
    const token = jwt.sign(
      { 
        id: user.rows[0].id, 
        role: user.rows[0].role,
        name: user.rows[0].name // This is correct
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Send token AND user info back (for AuthContext)
    res.json({
      token,
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name,
        role: user.rows[0].role
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;