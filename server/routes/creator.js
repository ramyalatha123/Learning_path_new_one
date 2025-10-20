const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const verifyToken = require("../middleware/auth"); // Assuming this is correct import
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- Multer storage config ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/assets");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Using a more robust filename to avoid potential collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });


// ✅ Route — drag & drop file upload (Keep this if you use it)
router.post("/upload-file", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const fileUrl = `/assets/${req.file.filename}`;
    res.status(200).json({ message: "File uploaded successfully", fileUrl: fileUrl });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ message: "Error uploading file" });
  }
});


// --- Simplified TEST Route: Create Learning Path ---
router.post(
  "/learning-paths",
  // verifyToken, // <-- Temporarily comment out authentication
  upload.single("image"), // Keep multer middleware
  async (req, res) => {
    // --- SIMPLIFIED TEST HANDLER ---
    console.log("--- TEST: Request Received ---");
    console.log("TEST File:", req.file); // Log the file multer found
    console.log("TEST Body:", req.body); // Log the text fields multer found

    // Send a response directly back to the frontend
    if (req.file && req.body && req.body.title) {
      // If we got file and title, it worked!
      res.status(200).json({
        message: "TEST OK: Multer received file and body.",
        fileName: req.file.filename,
        title: req.body.title,
        resources: req.body.resources, // Log resources string if received
        bodyReceived: req.body // Send back the whole body
      });
    } else {
      // If something is missing, send an error
      res.status(400).json({
        message: "TEST FAILED: Multer did not receive file or body correctly.",
        fileReceived: !!req.file, // true or false
        bodyReceived: req.body,   // Log what was received (likely {} or undefined)
      });
    }
    // --- END OF SIMPLIFIED TEST ---

    /* --- Temporarily comment out ALL your original database logic ---

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const userId = req.user.id; // This would fail if verifyToken is commented out

        if (!req.body) {
            console.error("!!! req.body is undefined AFTER multer processing !!!");
            if (client) await client.query('ROLLBACK');
            return res.status(400).json({ message: "Form data (title, resources) missing or invalid." });
        }

        const { title, resources } = req.body;
        console.log("[LOG] Extracted title:", title);
        console.log("[LOG] Extracted resources string:", resources);

        let image_url = null;
        if (!title || !resources) {
            console.error("!!! Title or resources missing AFTER destructuring !!!");
            if (client) await client.query('ROLLBACK');
            return res.status(400).json({ message: "Title and resources are required" });
        }
        if (req.file) {
            image_url = `/assets/${req.file.filename}`;
        } else {
             console.error("!!! Image file missing !!!");
             if (client) await client.query('ROLLBACK');
            return res.status(400).json({ message: "Image is required" });
        }

        let parsedResources;
        try {
            parsedResources = JSON.parse(resources);
            console.log("[LOG] Successfully parsed resources JSON.");
        } catch (parseError) {
             console.error("!!! Error parsing resources JSON:", parseError.message);
             if (client) await client.query('ROLLBACK');
             return res.status(400).json({ message: "Invalid format for resources data." });
        }

        console.log("[LOG] Inserting into LearningPaths...");
        const pathResult = await client.query(
            `INSERT INTO LearningPaths (creator_id, title, image_url) VALUES ($1, $2, $3) RETURNING id`,
            [userId, title, image_url]
        );
        const pathId = pathResult.rows[0].id;
        console.log(`[LOG] Inserted Learning Path with ID: ${pathId}`);

        console.log(`[LOG] Looping through ${parsedResources.length} resources to insert...`);
        for (let i = 0; i < parsedResources.length; i++) {
            const r = parsedResources[i];
            console.log(`[LOG] Inserting resource ${i + 1}: "${r.title}" (Type: ${r.type}, Order: ${r.order ?? i})`);
            const resourceResult = await client.query(
                `INSERT INTO Resources (path_id, title, type, url, description, estimated_time, "order")
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [ pathId, r.title, r.type, r.url || null, r.description || "", r.estimated_time || 0, r.order ?? i ]
            );
            const resourceId = resourceResult.rows[0].id;
            console.log(`[LOG] Inserted resource with ID: ${resourceId}`);

            if (r.type === "quiz" && r.questions && r.questions.length > 0) {
                 console.log(`[LOG] Processing ${r.questions.length} questions for quiz resource ID: ${resourceId}`);
                for (const q of r.questions) {
                    const questionResult = await client.query('INSERT INTO Questions (resource_id, question_text) VALUES ($1, $2) RETURNING id', [resourceId, q.text]);
                    const questionId = questionResult.rows[0].id;
                     console.log(`[LOG] Inserted question with ID: ${questionId}`);
                    for (const o of q.options) {
                        await client.query('INSERT INTO Options (question_id, option_text, is_correct) VALUES ($1, $2, $3)', [questionId, o.text, o.isCorrect]);
                    }
                     console.log(`[LOG] Inserted ${q.options.length} options for question ID: ${questionId}`);
                }
            } else if (r.type === "quiz") {
                console.log(`[LOG] Quiz resource ID: ${resourceId} has no questions.`);
            }
        }

        console.log("[LOG] Committing transaction...");
        await client.query("COMMIT");
        console.log("[LOG] Transaction committed successfully.");
        res.status(201).json({ message: "Learning Path created successfully", pathId });

    } catch (err) {
        console.error("!!! Error during path creation transaction:", err.message, err.stack);
        if (client) {
             console.log("[LOG] Rolling back transaction due to error...");
             await client.query("ROLLBACK");
             console.log("[LOG] Transaction rolled back.");
        }
        res.status(500).json({ message: "Server Error" });
    } finally {
        if (client) {
             console.log("[LOG] Releasing database client.");
             client.release();
        }
    }
    */
  }
);

// --- Update Resource Order (Keep existing code) ---
router.put("/resources/reorder", verifyToken, async (req, res) => {
    // ... (Your reorder logic here) ...
});

// --- Toggle Visibility (Keep existing code) ---
router.put('/paths/:pathId/visibility', verifyToken, async (req, res) => {
    // ... (Your visibility toggle logic here) ...
});

module.exports = router;