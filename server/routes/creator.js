const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const verifyToken = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ... (your existing multer storage config is fine) ...
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/assets");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, "image-" + uniqueSuffix); // Changed filename slightly
  },
});
const upload = multer({ storage: storage });


// --- UPDATED ROUTE: Create Learning Path (with Quizzes) ---
router.post(
  "/learning-paths",
  verifyToken,
  upload.single("image"), 
  async (req, res) => {
    // Use a DB transaction to make sure everything saves, or nothing
    const client = await pool.connect(); 
    try {
      await client.query('BEGIN'); // Start transaction

      const userId = req.user.id;
      const { title, resources } = req.body;
      let image_url = null;

      if (!title || !resources) {
        return res.status(400).json({ message: "Title and resources are required" });
      }
      if (req.file) {
        image_url = `/assets/${req.file.filename}`;
      } else {
        return res.status(400).json({ message: "Image is required" });
      }

      const parsedResources = JSON.parse(resources);

      // 1. Insert Learning Path
      const pathResult = await client.query(
        "INSERT INTO LearningPaths (creator_id, title, image_url) VALUES ($1, $2, $3) RETURNING id",
        [userId, title, image_url]
      );
      const pathId = pathResult.rows[0].id;

      // 2. Loop and insert all resources
      for (const r of parsedResources) {
        // Insert the resource (Video, Article, or Quiz)
        const resourceResult = await client.query(
          `INSERT INTO Resources (path_id, title, type, url, description, estimated_time) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            pathId,
            r.title,
            r.type,
            r.url || null, // URL is null for quizzes
            r.description || "",
            r.estimatedTime || 0
          ]
        );
        const resourceId = resourceResult.rows[0].id;

        // --- NEW QUIZ LOGIC ---
        // If the resource is a quiz, insert its questions and options
        if (r.type === 'quiz' && r.questions) {
          for (const q of r.questions) {
            // Insert Question
            const questionResult = await client.query(
              'INSERT INTO Questions (resource_id, question_text) VALUES ($1, $2) RETURNING id',
              [resourceId, q.text]
            );
            const questionId = questionResult.rows[0].id;

            // Insert Options
            for (const o of q.options) {
              await client.query(
                'INSERT INTO Options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
                [questionId, o.text, o.isCorrect]
              );
            }
          }
        }
        // --- END QUIZ LOGIC ---
      }

      await client.query('COMMIT'); // Commit transaction
      res.status(201).json({ message: "Learning Path created successfully", pathId });

    } catch (err) {
      await client.query('ROLLBACK'); // Rollback on error
      console.error("Error creating learning path:", err);
      res.status(500).json({ message: "Server Error" });
    } finally {
      client.release(); // Release client back to pool
    }
  }
);

module.exports = router;