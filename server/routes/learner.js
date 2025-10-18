const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { verifyToken } = require("../middleware/auth");

// GET all learning paths with resources
// GET all learning paths with resources & progress
router.get("/learning-paths", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });

    const pathsResult = await pool.query(`
  SELECT id, title, image_url, short_description, created_at 
  FROM LearningPaths 
  ORDER BY created_at ASC
`);
    const paths = pathsResult.rows;

    for (let path of paths) {
      // get resources for this path
      const resourcesRes = await pool.query(
        "SELECT r.*, lp.completed FROM Resources r LEFT JOIN LearnerProgress lp ON r.id = lp.resource_id AND lp.learner_id = $1 WHERE r.path_id = $2",
        [req.user.id, path.id]
      );
      path.resources = resourcesRes.rows;

      // calculate progress
      const total = path.resources.length;
      const completed = path.resources.filter(r => r.completed).length;
      path.progress = total ? Math.round((completed / total) * 100) : 0;
      path.completed = path.progress === 100; // mark if full path is completed
    }

    res.json(paths);
  } catch (err) {
    console.error("Error fetching learning paths:", err);
    res.status(500).json({ message: "Server Error" });
  }
});


// POST /api/learner/register-path
router.post("/register-path", verifyToken, async (req, res) => {
  try {
    const { path_id } = req.body;
    if (req.user.role !== "learner") {
      return res.status(403).json({ message: "Access denied" });
    }

    await pool.query(
      `INSERT INTO LearnerLearningPaths (learner_id, path_id) 
       VALUES ($1, $2)
       ON CONFLICT (learner_id, path_id) DO NOTHING`,
      [req.user.id, path_id]
    );

    res.json({ message: "Registered successfully" });
  } catch (err) {
    console.error("Error registering learning path:", err);
    res.status(500).json({ message: "Server Error" });
  }
});
router.post("/complete-resource/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });

    const resourceId = req.params.id;
    const learnerId = req.user.id;

    await pool.query(
      `INSERT INTO LearnerProgress (learner_id, resource_id, completed)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`,
      [learnerId, resourceId]
    );

    res.json({ message: "Resource marked as completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


module.exports = router;
