const express = require('express');
const router = express.Router();
const { pool } = require('../db'); 
const authMiddleware = require('../middleware/auth'); 

// --- 1. GET /api/paths/mypaths - Fetch paths created by the logged-in user (Existing Route) ---
router.get('/mypaths', authMiddleware, async (req, res) => {
    if (req.user.role !== 'creator') {
        return res.status(403).json({ message: 'Access denied. Creator role required.' });
    }

    try {
        const creator_id = req.user.id;
        const myPaths = await pool.query(
            'SELECT id, title, is_public FROM LearningPaths WHERE creator_id = $1 ORDER BY id ASC',
            [creator_id]
        );
        res.json(myPaths.rows);
    } catch (err) {
        console.error("Error fetching creator paths:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// -------------------------------------------------------------------------
// --- 2. GET /api/paths/:pathId - Fetch a single path by ID (FIXED FOR PREVIEW) ---
// -------------------------------------------------------------------------
router.get('/view/:pathId', authMiddleware, async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user.id; // User ID from the token
    console.log("--- CONFIRMING PATHS.JS FIXED ROUTE IS EXECUTING ---");
    try {
        // 1. Fetch path information and its creator ID
        const pathResult = await pool.query(
            'SELECT id, title, short_description, is_public, creator_id FROM LearningPaths WHERE id = $1',
            [pathId]
        );

        const path = pathResult.rows[0];

        if (!path) {
            return res.status(404).json({ message: 'Path not found.' });
        }

        // 2. AUTHORIZATION LOGIC (The Fix: Using == for loose comparison)
        // This solves the integer/string ID mismatch issue.
        const isCreator = path.creator_id == userId; // <--- CHANGED FROM === TO ==
        const isPublic = path.is_public;
        
        // 3. Conditional Enrollment Check (for completeness/future)
        // If a path is private, check if the user is enrolled. 
        let isEnrolledLearner = false;
        if (!isPublic && !isCreator && req.user.role === 'learner') {
             const enrollCheck = await pool.query('SELECT 1 FROM Enrollments WHERE user_id = $1 AND path_id = $2', [userId, pathId]);
             isEnrolledLearner = enrollCheck.rows.length > 0;
        }

        // ALLOW ACCESS IF: Path is Public OR User is the Creator OR User is an Enrolled Learner (Private Path)
        if (!isPublic && !isCreator && !isEnrolledLearner) {
             return res.status(403).json({ message: 'Access denied: Path is private and you are not the creator or an enrolled learner.' });
        }
        
        // 4. Fetch Resources (if authorized)
        const resourceResult = await pool.query(
            'SELECT * FROM Resources WHERE path_id = $1 ORDER BY "order" ASC', 
            [pathId]
        );
        
        // 5. Send the data
        res.json({ 
            path: { 
                id: path.id, 
                title: path.title, 
                description: path.description, 
                is_public: path.is_public 
            }, 
            resources: resourceResult.rows 
        });

    } catch (err) {
        console.error("Error fetching single path:", err.message);
        res.status(500).json({ message: 'Server Error fetching path.' });
    }
});

module.exports = router;