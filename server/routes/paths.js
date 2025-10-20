const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Adjust path if needed
const authMiddleware = require('../middleware/auth'); // Adjust path if needed

// GET /api/paths/mypaths - Fetch paths created by the logged-in user
router.get('/mypaths', authMiddleware, async (req, res) => {
  // Check if the user is a creator (optional, but good practice)
  if (req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied. Creator role required.' });
  }

  try {
    const creator_id = req.user.id;

    // Fetch id, title, and is_public status for the creator's paths
    const myPaths = await pool.query(
      'SELECT id, title, is_public FROM LearningPaths WHERE creator_id = $1 ORDER BY id ASC',
      [creator_id]
    );

    res.json(myPaths.rows); // Send the list of paths

  } catch (err) {
    console.error("Error fetching creator paths:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// You can add other general path routes here later if needed (e.g., get a single path by ID)

module.exports = router; // Export the router