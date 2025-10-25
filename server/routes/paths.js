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
        // 🛑 CRITICAL FIX: Use JOIN, COUNT, and SUM to retrieve all data required by the dashboard cards
        const myPaths = await pool.query(
            `SELECT 
                lp.id, 
                lp.title, 
                lp.image_url, 
                lp.is_public,
                -- 1. Calculate Resource Count
                COUNT(r.id) AS resource_count, 
                -- 2. Calculate Total Time (Use COALESCE to ensure 0 is returned if no resources exist)
                COALESCE(SUM(r.estimated_time), 0) AS total_time 
            FROM LearningPaths lp
            LEFT JOIN Resources r ON lp.id = r.path_id
            WHERE lp.creator_id = $1
            GROUP BY lp.id, lp.title, lp.image_url, lp.is_public -- Group by all non-aggregated columns
            ORDER BY lp.id DESC`,
            [creator_id]
        );
        
        // Final sanity check for console logging
        console.log(`[LOG /mypaths] Found ${myPaths.rows.length} paths with stats.`);

        res.json(myPaths.rows);

    } catch (err) {
        console.error("Error fetching creator paths:", err.message, err.stack);
        res.status(500).json({ message: "Server Error fetching creator paths." });
    }
});
// Add this to paths.js (after your /mypaths route)
router.get('/learning-paths/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const creator_id = req.user.id;

        // Get the path (ensure user owns it)
        const pathResult = await pool.query(
            'SELECT * FROM LearningPaths WHERE id = $1 AND creator_id = $2',
            [id, creator_id]
        );

        if (pathResult.rows.length === 0) {
            return res.status(404).json({ message: 'Path not found or access denied' });
        }

        // Get ALL resources for this path
        const resourcesResult = await pool.query(
            'SELECT * FROM Resources WHERE path_id = $1 ORDER BY order_index',
            [id]
        );

        // Combine path data with resources
        const pathWithResources = {
            ...pathResult.rows[0],
            resources: resourcesResult.rows
        };

        console.log(`[LOG] Fetched path ${id} with ${resourcesResult.rows.length} resources`);
        res.json(pathWithResources);

    } catch (err) {
        console.error('Error fetching path details:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// -------------------------------------------------------------------------
// --- 2. GET /api/paths/view/:pathId - FIXED TO INCLUDE LEARNER PROGRESS ---
// -------------------------------------------------------------------------
router.get('/view/:pathId', authMiddleware, async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user.id; // User ID from the token
    console.log(`--- Fetching path ${pathId} for user ${userId} ---`);
    
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
         
        // 2. AUTHORIZATION LOGIC
        const isCreator = path.creator_id == userId;
        const isPublic = path.is_public;
                 
        // 3. Conditional Enrollment Check
        let isEnrolledLearner = false;
        if (!isPublic && !isCreator && req.user.role === 'learner') {
            const enrollCheck = await pool.query(
                'SELECT 1 FROM LearnerLearningPaths WHERE learner_id = $1 AND path_id = $2', 
                [userId, pathId]
            );
            isEnrolledLearner = enrollCheck.rows.length > 0;
        }
         
        // ALLOW ACCESS IF: Path is Public OR User is the Creator OR User is an Enrolled Learner
        if (!isPublic && !isCreator && !isEnrolledLearner) {
            return res.status(403).json({ message: 'Access denied: Path is private and you are not the creator or an enrolled learner.' });
        }
                 
        // 🎯 4. FIXED: Fetch Resources WITH completion status from LearnerProgress
        console.log(`[LOG] Fetching resources with progress for user ${userId}...`);
        const resourceResult = await pool.query(
            `SELECT r.*, 
                    COALESCE(lp.completed, false) AS completed
             FROM Resources r
             LEFT JOIN LearnerProgress lp ON r.id = lp.resource_id AND lp.learner_id = $1
             WHERE r.path_id = $2
             ORDER BY r."order" ASC, r.id ASC`,
            [userId, pathId]  // Pass userId first, then pathId
        );
        
        console.log(`[LOG] Found ${resourceResult.rows.length} resources`);
                 
        // 5. Send the data with resources including completed status
        res.json({
            id: path.id,
            title: path.title,
            short_description: path.short_description,
            is_public: path.is_public,
            resources: resourceResult.rows  // Now includes 'completed' field
        });
     
    } catch (err) {
        console.error("Error fetching single path:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching path.' });
    }
});

module.exports = router;