const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const PDFDocument = require('pdfkit');
const authMiddleware = require('../middleware/auth'); // Correct import

// GET all learning paths visible to the learner (public or enrolled)
router.get("/learning-paths", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });
    const learnerId = req.user.id;
    const pathsResult = await pool.query(`
      SELECT DISTINCT lp.id, lp.title, lp.image_url, lp.short_description, lp.created_at, lp.is_public,
             (EXISTS (SELECT 1 FROM LearnerLearningPaths llp WHERE llp.learner_id = $1 AND llp.path_id = lp.id)) AS registered
      FROM LearningPaths lp
      LEFT JOIN LearnerLearningPaths llp_filter ON lp.id = llp_filter.path_id AND llp_filter.learner_id = $1
      WHERE lp.is_public = true OR llp_filter.learner_id = $1
      ORDER BY lp.created_at ASC
    `, [learnerId]);
    const paths = pathsResult.rows;
    for (let path of paths) {
      const resourcesRes = await pool.query(
        `SELECT r.*, COALESCE(lp.completed, false) AS completed
         FROM Resources r
         LEFT JOIN LearnerProgress lp ON r.id = lp.resource_id AND lp.learner_id = $1
         WHERE r.path_id = $2
         ORDER BY r."order" ASC, r.id ASC`,
        [learnerId, path.id]
      );
      path.resources = resourcesRes.rows;
      const total = path.resources.length;
      const completedCount = path.resources.filter(r => r.completed).length;
      path.progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      path.completed = total > 0 && path.progress === 100;
    }
    res.json(paths);
  } catch (err) {
    console.error("Error fetching learning paths:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/learner/path/:pathId (Includes DEBUG LOGS)
// router.get("/path/:pathId", authMiddleware, async (req, res) => {
//   const { pathId } = req.params;
//   const { id: userId } = req.user;
//   console.log(`--- Handling GET /path/${pathId} for user ${userId} ---`);
//   try {
//     console.log("[LOG] Fetching path details from LearningPaths table...");
//     const pathResult = await pool.query( "SELECT * FROM LearningPaths WHERE id = $1", [pathId] );
//     console.log(`[LOG] Path query result rows: ${pathResult.rows.length}`);
//     if (pathResult.rows.length === 0) {
//       console.log(`[LOG] Path with ID ${pathId} not found. Sending 404.`);
//       return res.status(404).json({ message: "Path not found" });
//     }
//     const path = pathResult.rows[0];
//     console.log(`[LOG] Path found: ${path.title} (ID: ${path.id})`);
//     console.log(`[LOG] Fetching resources for path ID ${pathId}...`);
//     const resourcesResult = await pool.query(
//       `SELECT r.*, p.completed AS is_completed
//        FROM Resources r
//        LEFT JOIN LearnerProgress p ON r.id = p.resource_id AND p.learner_id = $1
//        WHERE r.path_id = $2
//        ORDER BY r."order" ASC, r.id ASC`,
//       [userId, pathId]
//     );
//     console.log(`[LOG] Resources query result rows: ${resourcesResult.rows.length}`);
//     path.resources = resourcesResult.rows.map(r => ({ ...r, completed: !!r.is_completed }));
//     console.log("[LOG] Sending final path object with resources to frontend.");
//     res.json(path);
//   } catch (err) {
//     console.error(`!!! ERROR in GET /path/${pathId}:`, err.message, err.stack);
//     res.status(500).send("Server Error");
//   }
// });

// POST /api/learner/register-path (Keep existing code)
router.post("/register-path", authMiddleware, async (req, res) => {
  try {
    const { path_id } = req.body;
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });
    await pool.query(
      `INSERT INTO LearnerLearningPaths (learner_id, path_id) VALUES ($1, $2) ON CONFLICT (learner_id, path_id) DO NOTHING`,
      [req.user.id, path_id]
    );
    res.json({ message: "Registered successfully" });
  } catch (err) { console.error("Error registering learning path:", err); res.status(500).json({ message: "Server Error" }); }
});


// --- UPDATED: POST /api/learner/complete-resource/:id ---
// Now includes logic to check for path completion and issue certificate
router.post("/complete-resource/:id", authMiddleware, async (req, res) => {
    const resourceId = req.params.id;
    const learnerId = req.user.id;
    const client = await pool.connect(); // Use a client for transaction

    try {
        await client.query('BEGIN'); // Start transaction

        // --- Step 1: Mark the resource as complete ---
        console.log(`[LOG] Marking resource ${resourceId} complete for user ${learnerId}`);
        await client.query(
            `INSERT INTO LearnerProgress (learner_id, resource_id, completed)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`,
            [learnerId, resourceId]
        );
        console.log("[LOG] LearnerProgress updated.");

        // --- Step 2: Check if the entire path is now complete ---
        // Find the pathId associated with this resourceId
        const resourcePathQuery = await client.query(
            'SELECT path_id FROM Resources WHERE id = $1',
            [resourceId]
        );

        if (resourcePathQuery.rows.length === 0) {
            console.log(`[LOG] Could not find path_id for resource ${resourceId}. Skipping certificate check.`);
            await client.query('COMMIT'); // Commit the progress update only
            client.release(); // Release client
            return res.json({ message: "Resource marked as completed (Path ID not found)." });
        }
        const pathId = resourcePathQuery.rows[0].path_id;
        console.log(`[LOG] Resource ${resourceId} belongs to path ${pathId}. Checking completion status...`);

        // Count total resources vs completed resources for this path and user
        const completionCheckQuery = await client.query(
            `SELECT
               (SELECT COUNT(*) FROM Resources WHERE path_id = $1) AS total_resources,
               (SELECT COUNT(*) FROM LearnerProgress lp
                JOIN Resources r ON lp.resource_id = r.id
                WHERE lp.learner_id = $2 AND r.path_id = $1 AND lp.completed = TRUE) AS completed_resources
            `,
            [pathId, learnerId]
        );

        // Ensure rows[0] exists before destructuring
        if (!completionCheckQuery.rows[0]) {
             console.error(`!!! ERROR: Completion check query returned no rows for path ${pathId}, user ${learnerId}`);
             throw new Error("Failed to check path completion status.");
        }

        const totalResources = parseInt(completionCheckQuery.rows[0].total_resources, 10);
        const completedResources = parseInt(completionCheckQuery.rows[0].completed_resources, 10);
        console.log(`[LOG] Path ${pathId} completion: ${completedResources} / ${totalResources}`);

        // --- Step 3: If complete, INSERT into Certificates table ---
        if (totalResources > 0 && completedResources >= totalResources) {
            console.log(`[LOG] Path ${pathId} is 100% complete for user ${learnerId}. Attempting to issue certificate...`);
            // Use ON CONFLICT to avoid errors if certificate already exists
            const certInsertResult = await client.query(
                `INSERT INTO Certificates (user_id, path_id, issue_date)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id, path_id) DO NOTHING`, // Prevent duplicates
                [learnerId, pathId]
            );
             // Check if a row was actually inserted
             if (certInsertResult.rowCount > 0) {
                 console.log("[LOG] New certificate record inserted.");
             } else {
                 console.log("[LOG] Certificate record already exists.");
             }
        } else {
             console.log(`[LOG] Path ${pathId} not yet fully complete (${completedResources}/${totalResources}).`);
        }

        console.log("[LOG] Committing transaction...");
        await client.query('COMMIT'); // Commit all changes (progress and potentially certificate)
        console.log("[LOG] Transaction committed.");
        res.json({ message: "Resource marked as completed." });

    } catch (err) {
        console.error("!!! ERROR completing resource or issuing certificate:", err.message, err.stack);
        // Ensure rollback happens even if client wasn't defined
        if (client) {
            console.log("[LOG] Rolling back transaction due to error...");
            await client.query('ROLLBACK');
            console.log("[LOG] Transaction rolled back.");
        }
        res.status(500).json({ message: err.message || "Server Error" }); // Send specific error if possible
    } finally {
        // Ensure client is always released
        if (client) {
             console.log("[LOG] Releasing database client.");
             client.release();
        }
    }
});
// --- END OF UPDATED ROUTE ---

// GET /api/learner/certificate/:pathId (Keep existing code)


router.get("/quiz/:resourceId", authMiddleware, async (req, res) => {
  const { resourceId } = req.params;
  const userId = req.user.id; // Get user ID for logging context
  console.log(`--- Handling GET /quiz/${resourceId} for user ${userId} ---`); // Log entry

  try {
    // 1. Get all questions for the quiz
    console.log(`[LOG /quiz] Fetching questions for resource ID: ${resourceId}...`);
    const questionsResult = await pool.query(
      'SELECT id, question_text FROM Questions WHERE resource_id = $1 ORDER BY id ASC', // Added ORDER BY
      [resourceId]
    );
    const questions = questionsResult.rows;
    console.log(`[LOG /quiz] Found ${questions.length} questions.`);

    // 2. For each question, get its options
    if (questions.length > 0) {
        console.log("[LOG /quiz] Fetching options for each question...");
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            console.log(`[LOG /quiz]   Fetching options for question ID: ${q.id} ("${q.question_text.substring(0, 30)}...")`);
            const optionsResult = await pool.query(
                // Select ID and text, explicitly NOT is_correct
                'SELECT id, option_text FROM Options WHERE question_id = $1 ORDER BY id ASC', // Added ORDER BY
                [q.id]
            );
            q.options = optionsResult.rows;
             console.log(`[LOG /quiz]   Found ${q.options.length} options for question ID: ${q.id}`);
        }
        console.log("[LOG /quiz] Finished fetching all options.");
    }

    console.log("[LOG /quiz] Sending questions data to frontend.");
    res.json(questions); // Send the array of questions with their options

  } catch (err) {
    console.error(`!!! ERROR in GET /quiz/${resourceId}:`, err.message, err.stack); // Log full error
    if (!res.headersSent) {
      res.status(500).send('Server Error fetching quiz questions.');
    }
  }
});

// POST /api/learner/quiz/submit (Keep existing code)
router.post("/quiz/submit", authMiddleware, async (req, res) => {
  // Extract resourceId and the answers object { questionId: optionId, ... }
  const { resourceId, answers } = req.body;
  const { id: userId } = req.user; // Get user ID from token

  // Log entry point
  console.log(`--- Handling POST /quiz/submit for resource ${resourceId}, user ${userId} ---`);
  console.log("[LOG /quiz/submit] Received answers:", answers);

  try {
    // Basic validation: Check if answers object exists and is not empty
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
        console.log("[LOG /quiz/submit] No answers submitted or invalid format. Sending score 0.");
        // Return score 0 immediately if no answers were provided
        return res.json({ score: 0, passed: false, message: "No answers submitted." });
    }

    // Get an array of the question IDs the user answered
    const questionIds = Object.keys(answers).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    console.log(`[LOG /quiz/submit] Processing answers for question IDs: ${questionIds.join(', ')}`);

    // Handle case where parsing might result in an empty array
    if (questionIds.length === 0) {
      console.log("[LOG /quiz/submit] No valid question IDs found in answers. Sending score 0.");
      return res.json({ score: 0, passed: false, message: "Invalid answer format." });
    }

    // Fetch the correct option IDs for the questions answered
    console.log("[LOG /quiz/submit] Fetching correct options from database...");
    const correctOptionsResult = await pool.query(
      `SELECT question_id, id as correct_option_id
       FROM Options
       WHERE question_id = ANY($1::int[]) AND is_correct = TRUE`, // Use ANY for array matching
      [questionIds] // Pass the array of question IDs
    );
    console.log(`[LOG /quiz/submit] Found ${correctOptionsResult.rows.length} correct options in DB.`);

    // Create a map for easy lookup: { questionId: correctOptionId }
    const correctAnswers = {};
    correctOptionsResult.rows.forEach(row => {
      correctAnswers[row.question_id] = row.correct_option_id;
    });
    console.log("[LOG /quiz/submit] Correct answers map created:", correctAnswers);

    // Compare user's submitted answers to the correct answers
    let correctCount = 0;
    for (const questionId of questionIds) {
        const userAnswerId = parseInt(answers[questionId], 10); // Ensure user's answer ID is a number
        const correctAnswerId = correctAnswers[questionId]; // Get correct ID from map

        console.log(`[LOG /quiz/submit] QID ${questionId}: User Answer=${userAnswerId}, Correct Answer=${correctAnswerId}`);

        // Check if the correct answer exists for this question and if it matches user's answer
        if (correctAnswerId !== undefined && userAnswerId === correctAnswerId) {
            correctCount++;
            console.log(`[LOG /quiz/submit]   Correct!`);
        } else {
            console.log(`[LOG /quiz/submit]   Incorrect.`);
        }
    }
    console.log(`[LOG /quiz/submit] Total correct answers: ${correctCount} out of ${questionIds.length}`);

    // Calculate score and determine if the user passed
    const score = Math.round((correctCount / questionIds.length) * 100);
    const passed = score >= 70; // Set your passing threshold (e.g., 70%)
    console.log(`[LOG /quiz/submit] Final Score: ${score}%, Passed: ${passed}`);

    // If the user passed the quiz, mark the corresponding resource as complete
    if (passed) {
      console.log(`[LOG /quiz/submit] User passed. Marking resource ${resourceId} as complete in LearnerProgress...`);
      // Use ON CONFLICT to safely insert or update the progress record
      await pool.query(
        `INSERT INTO LearnerProgress (learner_id, resource_id, completed)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`, // Update if already exists
        [userId, resourceId]
      );
      console.log(`[LOG /quiz/submit] Resource ${resourceId} marked complete in LearnerProgress.`);

      // --- ADD CERTIFICATE ISSUANCE LOGIC HERE IF A QUIZ CAN COMPLETE A PATH ---
      // (You might want to reuse the completion check logic from POST /complete-resource/:id)
      // Check if this resource completion finishes the whole path
      // If yes, INSERT INTO Certificates ... ON CONFLICT DO NOTHING
      // console.log("[LOG /quiz/submit] Checking if path is complete after quiz pass...");
      // ... (Add path completion check and certificate insert logic if needed) ...
      // ---
    }

    console.log("[LOG /quiz/submit] Sending score and pass status to frontend.");
    res.json({ score, passed }); // Send the final score and pass status

  } catch (err) {
    // Log the full error if anything goes wrong
    console.error("!!! ERROR processing quiz submission:", err.message, err.stack);
    // Ensure a response is sent if headers haven't been sent already
    if (!res.headersSent) {
      res.status(500).send("Server Error processing quiz submission.");
    }
  }
});


router.get("/certificate/:pathId", authMiddleware, async (req, res) => {
  const { pathId } = req.params;
  const { id: userId, name: userName } = req.user; // Get user's ID and name
  console.log(`--- Handling GET /certificate/${pathId} for user ${userId} ---`); // Log entry

  try {
    // 1. Get Path Title
    console.log("[LOG /certificate] Fetching path title...");
    const pathResult = await pool.query(
      "SELECT title FROM LearningPaths WHERE id = $1",
      [pathId]
    );
    console.log(`[LOG /certificate] Path title query rows: ${pathResult.rows.length}`);
    if (pathResult.rows.length === 0) {
       console.log("[LOG /certificate] Path not found. Sending 404.");
      return res.status(404).json({ message: "Path not found." });
    }
    const pathTitle = pathResult.rows[0].title;
    console.log(`[LOG /certificate] Path Title: ${pathTitle}`);

    // 2. Verify 100% completion
    console.log("[LOG /certificate] Verifying path completion...");
    const progressResult = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM Resources WHERE path_id = $1) AS total,
         (SELECT COUNT(*) FROM LearnerProgress WHERE learner_id = $2 AND resource_id IN
           (SELECT id FROM Resources WHERE path_id = $1) AND completed = TRUE) AS completed`,
      [pathId, userId]
    );
     console.log(`[LOG /certificate] Completion query rows: ${progressResult.rows.length}`);
     if (!progressResult.rows[0]) throw new Error("Completion check failed."); // Safety check

    const { total, completed } = progressResult.rows[0];
     console.log(`[LOG /certificate] Completion status: ${completed} / ${total}`);
    if (parseInt(total, 10) === 0 || parseInt(completed, 10) < parseInt(total, 10)) {
       console.log("[LOG /certificate] Path not complete. Sending 403.");
      return res.status(403).json({ message: "Path not 100% complete." });
    }
    console.log("[LOG /certificate] Completion verified.");

    // 3. Prepare PDF Data
    const learnerName = userName || 'Valued Learner';
    const completionDate = new Date().toLocaleDateString();
    console.log("[LOG /certificate] Generating PDF for:", learnerName, pathTitle);

    // 4. Create and Stream the PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });

    // Set headers BEFORE piping
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${pathId}.pdf"`);
    console.log("[LOG /certificate] Piping PDF document to response...");

    doc.pipe(res); // Connect PDF output directly to the HTTP response

    // Add PDF Content (keep existing code)
    doc.fontSize(50).fillColor('#0275d8').text('Certificate of Completion', { align: 'center' }); doc.moveDown(2);
    doc.fontSize(24).fillColor('black').text('This certifies that', { align: 'center' }); doc.moveDown(1.5);
    doc.fontSize(40).fillColor('#d9534f').text(learnerName, { align: 'center' }); doc.moveDown(1.5);
    doc.fontSize(24).fillColor('black').text('has successfully completed the learning path:', { align: 'center' }); doc.moveDown(1);
    doc.fontSize(30).text(pathTitle, { align: 'center' }); doc.moveDown(3);
    doc.fontSize(20).text(`Completion Date: ${completionDate}`, { align: 'center' });

    // Finalize the PDF - This triggers the actual generation and streaming
    console.log("[LOG /certificate] Finalizing PDF document...");
    doc.end();
    console.log("[LOG /certificate] PDF generation finished."); // This log might appear slightly after response finishes streaming

  } catch (err) {
    console.error("!!! ERROR generating certificate:", err.message, err.stack); // Log full error
    // Ensure error response is sent if headers not already sent by pipe
    if (!res.headersSent) {
      res.status(500).send("Server Error generating certificate.");
    }
  }
});

router.get('/my-certificates', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    console.log(`--- Handling GET /my-certificates for user ID: ${userId} ---`);

    try {
        console.log("[LOG] Preparing to query Certificates table...");
        const certificatesResult = await pool.query(
            `SELECT c.id, c.path_id, c.issue_date, lp.title AS path_title
             FROM Certificates c
             JOIN LearningPaths lp ON c.path_id = lp.id
             WHERE c.user_id = $1
             ORDER BY c.issue_date DESC`,
            [userId]
        );
        console.log(`[LOG] Query executed. Found ${certificatesResult.rows.length} certificates.`);
        console.log("[LOG] Sending certificate data to frontend.");
        res.json(certificatesResult.rows);

    } catch (err) {
        console.error("!!! ERROR fetching certificates in GET /my-certificates:", err.message, err.stack);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server Error fetching certificates.' });
        }
    }
});

// module.exports = router; // Should be at the very end

module.exports = router; // Ensure this is the only export at the bottom