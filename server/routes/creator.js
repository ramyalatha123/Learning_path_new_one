const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const verifyToken = require("../middleware/auth");
const path = require("path");
const fs = require("fs");

// --- Multer storage config ---
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary directly here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🔧 Cloudinary Config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'Set ✅' : 'Not Set ❌',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set ✅' : 'Not Set ❌'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'learning-paths',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    public_id: (req, file) => 'path-' + Date.now(),
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

console.log('✅ Multer with Cloudinary storage configured!');

// ✅ Upload file route
router.post("/upload-file", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const fileUrl = req.file.path;
    res.status(200).json({ message: "File uploaded successfully", fileUrl: fileUrl });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ message: "Error uploading file" });
  }
});

// 🎯 NEW: GET /creator/mypaths - Fetch creator's paths with details
router.get("/mypaths", verifyToken, async (req, res) => {
    if (req.user.role !== 'creator') {
        return res.status(403).json({ message: 'Access denied. Creator role required.' });
    }
    try {
        const userId = req.user.id;
        console.log(`--- Handling GET /mypaths for creator ID: ${userId} ---`);

        const result = await pool.query(
            `SELECT 
                lp.id, 
                lp.title, 
                lp.image_url,
                lp.is_public,
                lp.created_at,
                COUNT(r.id) as resource_count,
                COALESCE(SUM(r.estimated_time), 0) as total_time
             FROM LearningPaths lp
             LEFT JOIN Resources r ON lp.id = r.path_id
             WHERE lp.creator_id = $1
             GROUP BY lp.id
             ORDER BY lp.created_at DESC`,
            [userId]
        );
        console.log(`[LOG /mypaths] Found ${result.rows.length} paths.`);

        res.json(result.rows);

    } catch (err) {
        console.error("Error fetching creator's paths:", err.message, err.stack);
        res.status(500).json({ message: "Server Error fetching your paths." });
    }
});

// 🎯 NEW: GET /creator/paths/:pathId - Fetch single path for editing
router.get("/paths/:pathId", verifyToken, async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user.id;
    console.log(`--- Handling GET /paths/${pathId} for user ${userId} ---`);

    try {
        // Fetch path details
        const pathResult = await pool.query(
            'SELECT * FROM LearningPaths WHERE id = $1',
            [pathId]
        );

        if (pathResult.rows.length === 0) {
            return res.status(404).json({ message: 'Path not found.' });
        }

        const path = pathResult.rows[0];

        // Check ownership
        if (path.creator_id !== userId) {
            return res.status(403).json({ message: 'Access denied. You are not the creator of this path.' });
        }

        // Fetch resources with questions for quizzes
        const resourcesResult = await pool.query(
            `SELECT r.* FROM Resources r
             WHERE r.path_id = $1
             ORDER BY r."order" ASC, r.id ASC`,
            [pathId]
        );

        const resources = resourcesResult.rows;

        // For each quiz resource, fetch questions and options
        for (let resource of resources) {
            if (resource.type === 'quiz') {
                const questionsResult = await pool.query(
                    'SELECT id, question_text as text FROM Questions WHERE resource_id = $1 ORDER BY id ASC',
                    [resource.id]
                );

                const questions = questionsResult.rows;

                for (let question of questions) {
                    const optionsResult = await pool.query(
                        'SELECT id, option_text as text, is_correct as "isCorrect" FROM Options WHERE question_id = $1 ORDER BY id ASC',
                        [question.id]
                    );
                    question.options = optionsResult.rows;
                }

                resource.questions = questions;
            }
        }

        res.json({
            ...path,
            resources: resources
        });

    } catch (err) {
        console.error("Error fetching path for editing:", err.message, err.stack);
        res.status(500).json({ message: 'Server Error fetching path.' });
    }
});

// ✅ POST /creator/learning-paths - Create new learning path
router.post(
  "/learning-paths",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    console.log("--- Request Received for POST /learning-paths ---");
    console.log("Multer processed file:", req.file);
    console.log("Cloudinary URL:", req.file?.path);

    // 🎯 ADD THIS: Check if Cloudinary upload actually happened
    if (req.file) {
        console.log("✅ File object exists");
        console.log("File path (Cloudinary URL):", req.file.path);
        console.log("File public_id:", req.file.filename);
    } else {
        console.log("❌ No file received by multer!");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const userId = req.user.id;

        const { title, resources } = req.body;
        let image_url = null;

        if (!title || !resources) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Title and resources are required" });
        }

        if (req.file && req.file.path) {
            image_url = req.file.path;  // This is the Cloudinary URL
            console.log("[LOG] ✅ Cloudinary image URL:", image_url);
        } else {
            console.error("!!! Image file missing or upload failed !!!");
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Image upload failed" });
        }

        // ... rest of your code stays the same ...

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

        // Insert Learning Path
        console.log("[LOG] Inserting into LearningPaths...");
        const pathResult = await client.query(
            `INSERT INTO LearningPaths (creator_id, title, image_url, short_description, is_public) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [userId, title, image_url, req.body.short_description || '', true]
        );
        const pathId = pathResult.rows[0].id;
        console.log(`[LOG] Inserted Learning Path with ID: ${pathId}`);

        // Insert Resources
        console.log(`[LOG] Looping through ${parsedResources.length} resources to insert...`);
        for (let i = 0; i < parsedResources.length; i++) {
            const r = parsedResources[i];
            
            if (!r || typeof r !== 'object' || !r.title || !r.type) {
                console.error(`!!! Invalid resource object at index ${i}:`, r);
                throw new Error(`Invalid resource data at index ${i}.`);
            }
            
            const finalEstimatedTime = parseInt(r.estimated_time, 10) || 0;
            
            console.log(`[LOG] Inserting resource ${i + 1}: "${r.title}" (Type: ${r.type})`);
            
            const resourceResult = await client.query(
                `INSERT INTO Resources (path_id, title, type, url, description, estimated_time, "order")
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [pathId, r.title, r.type, r.url || null, r.description || "", finalEstimatedTime, r.order ?? i]
            );
            const resourceId = resourceResult.rows[0].id;
            console.log(`[LOG] ✅ Inserted resource with ID: ${resourceId}`);

            // Handle Quiz Questions
            if (r.type === "quiz" && r.questions && Array.isArray(r.questions) && r.questions.length > 0) {
                console.log(`[LOG] Processing ${r.questions.length} questions for quiz`);
                for (const q of r.questions) {
                    if (!q || !q.text || !Array.isArray(q.options)) { 
                        throw new Error(`Invalid question format`); 
                    }
                    const questionResult = await client.query(
                        'INSERT INTO Questions (resource_id, question_text) VALUES ($1, $2) RETURNING id', 
                        [resourceId, q.text]
                    );
                    const questionId = questionResult.rows[0].id;
                    
                    let correctOptionExists = false;
                    for (const o of q.options) {
                        if (!o || typeof o.text === 'undefined' || typeof o.isCorrect === 'undefined') { 
                            throw new Error(`Invalid option format`); 
                        }
                        if (o.isCorrect === true) correctOptionExists = true;
                        await client.query(
                            'INSERT INTO Options (question_id, option_text, is_correct) VALUES ($1, $2, $3)', 
                            [questionId, o.text, o.isCorrect]
                        );
                    }
                    
                    if (!correctOptionExists && q.options.length > 0) { 
                        throw new Error(`No correct option for question.`); 
                    }
                }
            }
        }

        console.log("[LOG] Committing transaction...");
        await client.query("COMMIT");
        console.log("[LOG] Transaction committed successfully.");
        res.status(201).json({ message: "Learning Path created successfully", pathId });

    } catch (err) {
        console.error("!!! Error during path creation:", err.message, err.stack);
        if (client) {
             console.log("[LOG] Rolling back transaction...");
             await client.query("ROLLBACK");
        }
        res.status(500).json({ message: err.message || "Server Error creating path." });
    } finally {
        if (client) {
             client.release();
        }
    }
});

// 🎯 NEW: PUT /creator/learning-paths/:pathId - Update learning path
router.put(
  "/learning-paths/:pathId",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user.id;
    console.log(`--- Handling PUT /learning-paths/${pathId} ---`);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Check ownership
        const pathCheck = await client.query(
            'SELECT creator_id FROM LearningPaths WHERE id = $1',
            [pathId]
        );

        if (pathCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Path not found.' });
        }

        if (pathCheck.rows[0].creator_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { title, resources } = req.body;

        if (!title || !resources) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Title and resources are required" });
        }

        let parsedResources;
        try {
            parsedResources = JSON.parse(resources);
            if (!Array.isArray(parsedResources)) throw new Error("Resources is not an array.");
        } catch (parseError) {
             await client.query('ROLLBACK');
             return res.status(400).json({ message: "Invalid format for resources data." });
        }

        // Update path title and image if new image uploaded
        let updateQuery = 'UPDATE LearningPaths SET title = $1';
        let updateParams = [title];
        
        if (req.file) {
            const image_url = req.file.path;
            console.log("[LOG] New Cloudinary image URL:", image_url);
            updateQuery += ', image_url = $2 WHERE id = $3';
            updateParams.push(image_url, pathId);
        } else {
            updateQuery += ' WHERE id = $2';
            updateParams.push(pathId);
        }

        await client.query(updateQuery, updateParams);
        console.log("[LOG] Updated path title/image");

        // Delete existing resources and their related data
        await client.query('DELETE FROM Resources WHERE path_id = $1', [pathId]);
        console.log("[LOG] Deleted old resources");

        // Insert updated resources
        for (let i = 0; i < parsedResources.length; i++) {
            const r = parsedResources[i];
            
            const finalEstimatedTime = parseInt(r.estimated_time, 10) || 0;
            
            const resourceResult = await client.query(
                `INSERT INTO Resources (path_id, title, type, url, description, estimated_time, "order")
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [pathId, r.title, r.type, r.url || null, r.description || "", finalEstimatedTime, r.order ?? i]
            );
            const resourceId = resourceResult.rows[0].id;

            // Handle Quiz Questions
            if (r.type === "quiz" && r.questions && Array.isArray(r.questions) && r.questions.length > 0) {
                for (const q of r.questions) {
                    const questionResult = await client.query(
                        'INSERT INTO Questions (resource_id, question_text) VALUES ($1, $2) RETURNING id', 
                        [resourceId, q.text]
                    );
                    const questionId = questionResult.rows[0].id;
                    
                    for (const o of q.options) {
                        await client.query(
                            'INSERT INTO Options (question_id, option_text, is_correct) VALUES ($1, $2, $3)', 
                            [questionId, o.text, o.isCorrect]
                        );
                    }
                }
            }
        }

        await client.query("COMMIT");
        console.log("[LOG] Path updated successfully");
        res.json({ message: "Learning Path updated successfully" });

    } catch (err) {
        console.error("!!! Error updating path:", err.message, err.stack);
        if (client) {
             await client.query("ROLLBACK");
        }
        res.status(500).json({ message: err.message || "Server Error updating path." });
    } finally {
        if (client) {
             client.release();
        }
    }
});

// 🎯 NEW: DELETE /creator/learning-paths/:pathId - Delete learning path
router.delete("/learning-paths/:pathId", verifyToken, async (req, res) => {
    const { pathId } = req.params;
    const userId = req.user.id;
    console.log(`--- Handling DELETE /learning-paths/${pathId} ---`);

    try {
        // Check ownership
        const pathCheck = await pool.query(
            'SELECT creator_id, image_url FROM LearningPaths WHERE id = $1',
            [pathId]
        );

        if (pathCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Path not found.' });
        }

        if (pathCheck.rows[0].creator_id !== userId) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        // Delete path (CASCADE should handle resources, questions, options)
        await pool.query('DELETE FROM LearningPaths WHERE id = $1', [pathId]);
        
        // Optionally delete the image file
        const imageUrl = pathCheck.rows[0].image_url;
        if (imageUrl) {
            const imagePath = path.join(__dirname, '../public', imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log("[LOG] Deleted image file:", imagePath);
            }
        }

        console.log("[LOG] Path deleted successfully");
        res.json({ message: "Learning Path deleted successfully" });

    } catch (err) {
        console.error("!!! Error deleting path:", err.message, err.stack);
        res.status(500).json({ message: "Server Error deleting path." });
    }
});

// ✅ Update Resource Order
router.put("/resources/reorder", verifyToken, async (req, res) => {
    const { orderedResources } = req.body;
    if (!Array.isArray(orderedResources)) return res.status(400).json({ message: "Invalid data format." });
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const resource of orderedResources) { 
            await client.query('UPDATE Resources SET "order" = $1 WHERE id = $2', [resource.order, resource.id]); 
        }
        await client.query("COMMIT");
        res.json({ message: "Resource order updated successfully." });
    } catch (err) { 
        await client.query("ROLLBACK"); 
        console.error("Error reordering resources:", err); 
        res.status(500).json({ message: "Server Error updating order." }); 
    } finally { 
        client.release(); 
    }
});

// ✅ Toggle Visibility
router.put('/paths/:pathId/visibility', verifyToken, async (req, res) => {
    const { pathId } = req.params; 
    const { is_public } = req.body; 
    const userId = req.user.id;
    
    if (typeof is_public !== 'boolean') return res.status(400).json({ message: 'Invalid value for is_public.' });
    
    try {
        const pathCheck = await pool.query('SELECT creator_id FROM LearningPaths WHERE id = $1', [pathId]);
        if (pathCheck.rows.length === 0) return res.status(404).json({ message: 'Learning Path not found.' });
        if (pathCheck.rows[0].creator_id !== userId) return res.status(403).json({ message: 'Access denied.' });
        
        await pool.query('UPDATE LearningPaths SET is_public = $1 WHERE id = $2', [is_public, pathId]);
        res.json({ message: `Path visibility updated successfully to ${is_public ? 'public' : 'private'}.` });
    } catch (err) { 
        console.error("Error updating path visibility:", err); 
        res.status(500).json({ message: 'Server Error' }); 
    }
});

module.exports = router;