const express = require("express");
const router = express.Router();
const { pool } = require("../db"); // PostgreSQL pool
const { verifyToken } = require("../middleware/auth"); // JWT middleware
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer to store images in public/assets
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/assets");
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Save file with timestamp to avoid duplicates
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage: storage });

// Create Learning Path with image and resources
router.post(
  "/learning-paths",
  verifyToken,
  upload.single("image"), // handle single image upload
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { title, resources } = req.body;

      if (!title || !resources) {
        return res.status(400).json({ message: "Title and resources are required" });
      }

      const parsedResources = JSON.parse(resources);

      if (!Array.isArray(parsedResources) || parsedResources.length === 0) {
        return res.status(400).json({ message: "At least one resource is required" });
      }

      // Save image URL
      let image_url = null;
      if (req.file) {
        image_url = `/assets/${req.file.filename}`;
      } else {
        return res.status(400).json({ message: "Image is required" });
      }

      // Insert Learning Path into database
      const pathResult = await pool.query(
        "INSERT INTO LearningPaths (creator_id, title, image_url) VALUES ($1, $2, $3) RETURNING id",
        [userId, title, image_url]
      );
      const pathId = pathResult.rows[0].id;

      // Insert resources
      for (const r of parsedResources) {
        await pool.query(
          "INSERT INTO Resources (path_id, title, url, description, estimated_time) VALUES ($1, $2, $3, $4, $5)",
          [pathId, r.title, r.url, r.description || "", r.estimatedTime || 0]
        );
      }

      res.json({ message: "Learning Path created successfully", pathId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

module.exports = router;
