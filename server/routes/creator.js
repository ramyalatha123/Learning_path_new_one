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


// --- CORRECTED Route: Create Learning Path (Database Logic Restored) ---
router.post(
  "/learning-paths",
  verifyToken, // <-- Authentication is active
  upload.single("image"), // Multer middleware
  async (req, res) => {
    // --- DEBUG LOGS ---
    console.log("--- Request Received for POST /learning-paths ---");
    console.log("Multer processed file:", req.file); // Log the file info
    console.log("Multer processed body:", req.body); // Log the text fields
    // --- END OF DEBUG LOGS ---

    // --- Start Database Logic ---
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const userId = req.user.id; // Get user ID from token

        // --- SAFETY CHECK for req.body ---
        if (!req.body) {
            console.error("!!! req.body is undefined AFTER multer processing !!!");
            await client.query('ROLLBACK'); // Rollback before returning error
            return res.status(400).json({ message: "Form data (title, resources) missing or invalid." });
        }
        // --- END SAFETY CHECK ---

        // Attempt to destructure
        const { title, resources } = req.body;

        // --- LOGS AFTER DESTRUCTURING ---
        console.log("[LOG] Extracted title:", title);
        console.log("[LOG] Extracted resources string:", resources);
        // ---

        let image_url = null;

        // --- CHECKS AFTER DESTRUCTURING ---
        if (!title || !resources) {
            console.error("!!! Title or resources missing AFTER destructuring !!!");
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Title and resources are required" });
        }
        // ---

        if (req.file) {
            image_url = `/assets/${req.file.filename}`;
            console.log("[LOG] Image file received, constructed image_url:", image_url);
        } else {
             console.error("!!! Image file missing !!!");
             await client.query('ROLLBACK');
            return res.status(400).json({ message: "Image is required" });
        }

        let parsedResources;
        try {
            parsedResources = JSON.parse(resources);
            console.log("[LOG] Successfully parsed resources JSON.");
            if (!Array.isArray(parsedResources)) throw new Error("Resources is not an array.");
        } catch (parseError) {
             console.error("!!! Error parsing resources JSON:", parseError.message);
             await client.query('ROLLBACK');
             return res.status(400).json({ message: "Invalid format for resources data." });
        }

        // 1️⃣ Insert Learning Path
        console.log("[LOG] Inserting into LearningPaths...");
        const pathResult = await client.query(
            // Also save short_description if available
            `INSERT INTO LearningPaths (creator_id, title, image_url, short_description, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [userId, title, image_url, req.body.short_description || '', true] // Assuming default public
        );
        const pathId = pathResult.rows[0].id;
        console.log(`[LOG] Inserted Learning Path with ID: ${pathId}`);

        // 2️⃣ Insert each Resource with "order"
        // 2️⃣ Insert each Resource with "order"
console.log(`[LOG] Looping through ${parsedResources.length} resources to insert...`);
for (let i = 0; i < parsedResources.length; i++) {
    const r = parsedResources[i];
    
    // Validate resource object
    if (!r || typeof r !== 'object' || !r.title || !r.type) {
        console.error(`!!! Invalid resource object at index ${i}:`, r);
        throw new Error(`Invalid resource data at index ${i}.`);
    }
    
    // 🛑 CRITICAL FIX: Now frontend sends 'estimated_time', so read that directly 🛑
    const finalEstimatedTime = parseInt(r.estimated_time, 10) || 0;
    
    console.log(`[LOG] Inserting resource ${i + 1}: "${r.title}" (Type: ${r.type}, EstTime: ${finalEstimatedTime} mins, Order: ${r.order ?? i})`);
    
    const resourceResult = await client.query(
        `INSERT INTO Resources (path_id, title, type, url, description, estimated_time, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [ pathId, r.title, r.type, r.url || null, r.description || "", finalEstimatedTime, r.order ?? i ]
    );
    const resourceId = resourceResult.rows[0].id;
    console.log(`[LOG] ✅ Inserted resource with ID: ${resourceId}, Time saved: ${finalEstimatedTime} mins`);

    // 3️⃣ Handle Quiz Resources
    if (r.type === "quiz" && r.questions && Array.isArray(r.questions) && r.questions.length > 0) {
        console.log(`[LOG] Processing ${r.questions.length} questions for quiz resource ID: ${resourceId}`);
        for (const q of r.questions) {
            // Add validation for question and options
            if (!q || !q.text || !Array.isArray(q.options)) { 
                throw new Error(`Invalid Q format @ R_ID ${resourceId}`); 
            }
            const questionResult = await client.query(
                'INSERT INTO Questions (resource_id, question_text) VALUES ($1, $2) RETURNING id', 
                [resourceId, q.text]
            );
            const questionId = questionResult.rows[0].id;
            console.log(`[LOG] Inserted question with ID: ${questionId}`);
            
            let correctOptionExists = false;
            for (const o of q.options) {
                if (!o || typeof o.text === 'undefined' || typeof o.isCorrect === 'undefined') { 
                    throw new Error(`Invalid Option format @ Q_ID ${questionId}`); 
                }
                if (o.isCorrect === true) correctOptionExists = true;
                await client.query(
                    'INSERT INTO Options (question_id, option_text, is_correct) VALUES ($1, $2, $3)', 
                    [questionId, o.text, o.isCorrect]
                );
            }
            
            if (!correctOptionExists && q.options.length > 0) { 
                throw new Error(`No correct option for Q_ID ${questionId}.`); 
            }
            console.log(`[LOG] Inserted ${q.options.length} options for question ID: ${questionId}`);
        }
    } else if (r.type === "quiz") {
        console.log(`[LOG] Quiz resource ID: ${resourceId} has no questions or invalid format.`);
        // throw new Error(`Quiz resource ID ${resourceId} must contain valid questions.`); // Uncomment if quizzes MUST have questions
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
        res.status(500).json({ message: err.message || "Server Error creating path." });
    } finally {
        if (client) {
             console.log("[LOG] Releasing database client.");
             client.release();
        }
    }
});


// --- Update Resource Order (Keep existing code) ---
router.put("/resources/reorder", verifyToken, async (req, res) => {
    const { orderedResources } = req.body;
    if (!Array.isArray(orderedResources)) return res.status(400).json({ message: "Invalid data format." });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const resource of orderedResources) { await client.query('UPDATE Resources SET "order" = $1 WHERE id = $2', [ resource.order, resource.id ]); }
        await client.query("COMMIT");
        res.json({ message: "Resource order updated successfully." });
    } catch (err) { await client.query("ROLLBACK"); console.error("Error reordering resources:", err); res.status(500).json({ message: "Server Error updating order." }); }
    finally { client.release(); }
});

// --- Toggle Visibility (Keep existing code) ---
router.put('/paths/:pathId/visibility', verifyToken, async (req, res) => {
    const { pathId } = req.params; const { is_public } = req.body; const userId = req.user.id;
    if (typeof is_public !== 'boolean') return res.status(400).json({ message: 'Invalid value for is_public.' });
    try {
        const pathCheck = await pool.query( 'SELECT creator_id FROM LearningPaths WHERE id = $1', [pathId] );
        if (pathCheck.rows.length === 0) return res.status(404).json({ message: 'Learning Path not found.' });
        if (pathCheck.rows[0].creator_id !== userId) return res.status(403).json({ message: 'Access denied.' });
        await pool.query( 'UPDATE LearningPaths SET is_public = $1 WHERE id = $2', [is_public, pathId] );
        res.json({ message: `Path visibility updated successfully to ${is_public ? 'public' : 'private'}.` });
    } catch (err) { console.error("Error updating path visibility:", err); res.status(500).json({ message: 'Server Error' }); }
});

// --- GET /api/creator/mypaths --- (Moved from paths.js as per user's structure)
// NOTE: This assumes you don't have a separate paths.js file anymore.
// If you DO have paths.js, this route should likely stay there.
router.get("/mypaths", verifyToken, async (req, res) => {
    // Check if the user is a creator
    if (req.user.role !== 'creator') {
        return res.status(403).json({ message: 'Access denied. Creator role required.' });
    }
    try {
        const userId = req.user.id;
        console.log(`--- Handling GET /mypaths for creator ID: ${userId} ---`);

        // Fetch paths created by this user, including visibility status
        const result = await pool.query(
            `SELECT id, title, is_public FROM LearningPaths WHERE creator_id = $1 ORDER BY id DESC`, // Changed order to DESC
            [userId]
        );
        console.log(`[LOG /mypaths] Found ${result.rows.length} paths.`);

        res.json(result.rows);

    } catch (err) {
        console.error("Error fetching creator's paths:", err.message, err.stack);
        res.status(500).json({ message: "Server Error fetching your paths." });
    }
});


module.exports = router;