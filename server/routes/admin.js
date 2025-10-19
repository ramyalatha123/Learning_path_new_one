const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Assuming db.js is one level up
const authMiddleware = require('../middleware/auth'); // Your JWT verification middleware

// Middleware to check specifically for the 'admin' role
const isAdmin = (req, res, next) => {
  // Check if user exists (from authMiddleware) and if their role is 'admin'
  if (req.user && req.user.role === 'admin') {
    next(); // Yes, they are admin, continue to the next function
  } else {
    // No, deny access
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// We will add the API routes (GET users, DELETE user, GET paths, DELETE path) here later.

// GET /api/admin/users - Get all users (Admin only)
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Fetch all users except other admins, ordered by ID
    const usersResult = await pool.query(
      "SELECT id, name, email, role FROM users WHERE role != 'admin' ORDER BY id ASC"
    );
    res.json(usersResult.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/admin/paths - Get all learning paths (Admin only)
router.get('/paths', authMiddleware, isAdmin, async (req, res) => {
  try {
    // Fetch paths and include the creator's email
    const pathsResult = await pool.query(
      `SELECT lp.id, lp.title, lp.created_at, u.email as creator_email
       FROM LearningPaths lp
       JOIN users u ON lp.creator_id = u.id
       ORDER BY lp.id ASC` // Show newest first
    );
    res.json(pathsResult.rows);
  } catch (err) {
    console.error("Error fetching all paths:", err);
    res.status(500).json({ message: "Server Error" });
  }
});



// DELETE /api/admin/users/:userId - Delete a user (Admin only)
router.delete('/users/:userId', authMiddleware, isAdmin, async (req, res) => {
  const { userId } = req.params;
  // Safety check: Prevent admin from deleting themselves
  if (req.user.id == userId) {
      return res.status(400).json({ message: "Admin cannot delete themselves." });
  }

  try {
    // Check if user exists and is not another admin
    const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    if (userCheck.rows[0].role === 'admin') {
         return res.status(403).json({ message: "Cannot delete other admins." });
    }

    // Delete the user (database cascades should handle related data)
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    res.json({ message: "User deleted successfully." });

  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE /api/admin/paths/:pathId - Delete a learning path (Admin only)
router.delete('/paths/:pathId', authMiddleware, isAdmin, async (req, res) => {
  const { pathId } = req.params;

  try {
    // Check if path exists
    const pathCheck = await pool.query("SELECT id FROM LearningPaths WHERE id = $1", [pathId]);
    if (pathCheck.rows.length === 0) {
      return res.status(404).json({ message: "Learning Path not found." });
    }

    // Delete the path (database cascades should handle resources, etc.)
    await pool.query("DELETE FROM LearningPaths WHERE id = $1", [pathId]);
    res.json({ message: "Learning Path deleted successfully." });

  } catch (err) {
    console.error("Error deleting learning path:", err);
    res.status(500).json({ message: "Server Error" });
  }
});
module.exports = router; // Export the router