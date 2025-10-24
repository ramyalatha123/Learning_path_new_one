const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const PDFDocument = require('pdfkit');
const authMiddleware = require('../middleware/auth');

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

// POST /api/learner/register-path
router.post("/register-path", authMiddleware, async (req, res) => {
  try {
    const { path_id } = req.body;
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });
    await pool.query(
      `INSERT INTO LearnerLearningPaths (learner_id, path_id) VALUES ($1, $2) ON CONFLICT (learner_id, path_id) DO NOTHING`,
      [req.user.id, path_id]
    );
    res.json({ message: "Registered successfully" });
  } catch (err) { 
    console.error("Error registering learning path:", err); 
    res.status(500).json({ message: "Server Error" }); 
  }
});

// POST /api/learner/complete-resource/:id
router.post("/complete-resource/:id", authMiddleware, async (req, res) => {
    const resourceId = req.params.id;
    const learnerId = req.user.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log(`[LOG] Marking resource ${resourceId} complete for user ${learnerId}`);
        await client.query(
            `INSERT INTO LearnerProgress (learner_id, resource_id, completed)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`,
            [learnerId, resourceId]
        );
        console.log("[LOG] LearnerProgress updated.");

        const resourcePathQuery = await client.query(
            'SELECT path_id FROM Resources WHERE id = $1',
            [resourceId]
        );

        if (resourcePathQuery.rows.length === 0) {
            console.log(`[LOG] Could not find path_id for resource ${resourceId}. Skipping certificate check.`);
            await client.query('COMMIT');
            client.release();
            return res.json({ message: "Resource marked as completed (Path ID not found)." });
        }
        const pathId = resourcePathQuery.rows[0].path_id;
        console.log(`[LOG] Resource ${resourceId} belongs to path ${pathId}. Checking completion status...`);

        const completionCheckQuery = await client.query(
            `SELECT
               (SELECT COUNT(*) FROM Resources WHERE path_id = $1) AS total_resources,
               (SELECT COUNT(*) FROM LearnerProgress lp
                JOIN Resources r ON lp.resource_id = r.id
                WHERE lp.learner_id = $2 AND r.path_id = $1 AND lp.completed = TRUE) AS completed_resources
            `,
            [pathId, learnerId]
        );

        if (!completionCheckQuery.rows[0]) {
             console.error(`!!! ERROR: Completion check query returned no rows for path ${pathId}, user ${learnerId}`);
             throw new Error("Failed to check path completion status.");
        }

        const totalResources = parseInt(completionCheckQuery.rows[0].total_resources, 10);
        const completedResources = parseInt(completionCheckQuery.rows[0].completed_resources, 10);
        console.log(`[LOG] Path ${pathId} completion: ${completedResources} / ${totalResources}`);

        if (totalResources > 0 && completedResources >= totalResources) {
            console.log(`[LOG] Path ${pathId} is 100% complete for user ${learnerId}. Attempting to issue certificate...`);
            const certInsertResult = await client.query(
                `INSERT INTO Certificates (user_id, path_id, issue_date)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id, path_id) DO NOTHING`,
                [learnerId, pathId]
            );
             if (certInsertResult.rowCount > 0) {
                 console.log("[LOG] New certificate record inserted.");
             } else {
                 console.log("[LOG] Certificate record already exists.");
             }
        } else {
             console.log(`[LOG] Path ${pathId} not yet fully complete (${completedResources}/${totalResources}).`);
        }

        console.log("[LOG] Committing transaction...");
        await client.query('COMMIT');
        console.log("[LOG] Transaction committed.");
        res.json({ message: "Resource marked as completed." });

    } catch (err) {
        console.error("!!! ERROR completing resource or issuing certificate:", err.message, err.stack);
        if (client) {
            console.log("[LOG] Rolling back transaction due to error...");
            await client.query('ROLLBACK');
            console.log("[LOG] Transaction rolled back.");
        }
        res.status(500).json({ message: err.message || "Server Error" });
    } finally {
        if (client) {
             console.log("[LOG] Releasing database client.");
             client.release();
        }
    }
});

// GET /api/learner/quiz/:resourceId
router.get("/quiz/:resourceId", authMiddleware, async (req, res) => {
  const { resourceId } = req.params;
  const userId = req.user.id;
  console.log(`--- Handling GET /quiz/${resourceId} for user ${userId} ---`);

  try {
    console.log(`[LOG /quiz] Fetching questions for resource ID: ${resourceId}...`);
    const questionsResult = await pool.query(
      'SELECT id, question_text FROM Questions WHERE resource_id = $1 ORDER BY id ASC',
      [resourceId]
    );
    const questions = questionsResult.rows;
    console.log(`[LOG /quiz] Found ${questions.length} questions.`);

    if (questions.length > 0) {
        console.log("[LOG /quiz] Fetching options for each question...");
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            console.log(`[LOG /quiz]   Fetching options for question ID: ${q.id} ("${q.question_text.substring(0, 30)}...")`);
            const optionsResult = await pool.query(
                'SELECT id, option_text FROM Options WHERE question_id = $1 ORDER BY id ASC',
                [q.id]
            );
            q.options = optionsResult.rows;
             console.log(`[LOG /quiz]   Found ${q.options.length} options for question ID: ${q.id}`);
        }
        console.log("[LOG /quiz] Finished fetching all options.");
    }

    console.log("[LOG /quiz] Sending questions data to frontend.");
    res.json(questions);

  } catch (err) {
    console.error(`!!! ERROR in GET /quiz/${resourceId}:`, err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).send('Server Error fetching quiz questions.');
    }
  }
});

// POST /api/learner/quiz/submit
router.post("/quiz/submit", authMiddleware, async (req, res) => {
  const { resourceId, answers } = req.body;
  const { id: userId } = req.user;

  console.log(`--- Handling POST /quiz/submit for resource ${resourceId}, user ${userId} ---`);
  console.log("[LOG /quiz/submit] Received answers:", answers);

  const client = await pool.connect();

  try {
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
        console.log("[LOG /quiz/submit] No answers submitted or invalid format. Sending score 0.");
        client.release();
        return res.json({ score: 0, passed: false, message: "No answers submitted." });
    }

    const questionIds = Object.keys(answers).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    console.log(`[LOG /quiz/submit] Processing answers for question IDs: ${questionIds.join(', ')}`);

    if (questionIds.length === 0) {
      console.log("[LOG /quiz/submit] No valid question IDs found in answers. Sending score 0.");
      client.release();
      return res.json({ score: 0, passed: false, message: "Invalid answer format." });
    }

    console.log("[LOG /quiz/submit] Fetching correct options from database...");
    const correctOptionsResult = await client.query(
      `SELECT question_id, id as correct_option_id
       FROM Options
       WHERE question_id = ANY($1::int[]) AND is_correct = TRUE`,
      [questionIds]
    );
    console.log(`[LOG /quiz/submit] Found ${correctOptionsResult.rows.length} correct options in DB.`);

    const correctAnswers = {};
    correctOptionsResult.rows.forEach(row => {
      correctAnswers[row.question_id] = row.correct_option_id;
    });
    console.log("[LOG /quiz/submit] Correct answers map created:", correctAnswers);

    let correctCount = 0;
    for (const questionId of questionIds) {
        const userAnswerId = parseInt(answers[questionId], 10);
        const correctAnswerId = correctAnswers[questionId];

        console.log(`[LOG /quiz/submit] QID ${questionId}: User Answer=${userAnswerId}, Correct Answer=${correctAnswerId}`);

        if (correctAnswerId !== undefined && userAnswerId === correctAnswerId) {
            correctCount++;
            console.log(`[LOG /quiz/submit]   Correct!`);
        } else {
            console.log(`[LOG /quiz/submit]   Incorrect.`);
        }
    }
    console.log(`[LOG /quiz/submit] Total correct answers: ${correctCount} out of ${questionIds.length}`);

    const score = Math.round((correctCount / questionIds.length) * 100);
    const passed = score >= 70;
    console.log(`[LOG /quiz/submit] Final Score: ${score}%, Passed: ${passed}`);

    if (passed) {
      console.log(`[LOG /quiz/submit] User passed. Starting transaction...`);
      await client.query('BEGIN');

      console.log(`[LOG /quiz/submit] Marking resource ${resourceId} as complete...`);
      await client.query(
        `INSERT INTO LearnerProgress (learner_id, resource_id, completed)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`,
        [userId, resourceId]
      );
      console.log(`[LOG /quiz/submit] Resource marked complete.`);

      console.log("[LOG /quiz/submit] Checking if path is complete...");
      
      const resourcePathQuery = await client.query(
        'SELECT path_id FROM Resources WHERE id = $1',
        [resourceId]
      );

      if (resourcePathQuery.rows.length > 0) {
        const pathId = resourcePathQuery.rows[0].path_id;
        console.log(`[LOG /quiz/submit] Resource belongs to path ${pathId}. Checking completion...`);

        const completionCheckQuery = await client.query(
          `SELECT
             (SELECT COUNT(*) FROM Resources WHERE path_id = $1) AS total_resources,
             (SELECT COUNT(*) FROM LearnerProgress lp
              JOIN Resources r ON lp.resource_id = r.id
              WHERE lp.learner_id = $2 AND r.path_id = $1 AND lp.completed = TRUE) AS completed_resources
          `,
          [pathId, userId]
        );

        if (completionCheckQuery.rows[0]) {
          const totalResources = parseInt(completionCheckQuery.rows[0].total_resources, 10);
          const completedResources = parseInt(completionCheckQuery.rows[0].completed_resources, 10);
          console.log(`[LOG /quiz/submit] Path ${pathId} completion: ${completedResources} / ${totalResources}`);

          if (totalResources > 0 && completedResources >= totalResources) {
            console.log(`[LOG /quiz/submit] 🎉 Path ${pathId} is 100% complete! Issuing certificate...`);
            const certInsertResult = await client.query(
              `INSERT INTO Certificates (user_id, path_id, issue_date)
               VALUES ($1, $2, NOW())
               ON CONFLICT (user_id, path_id) DO NOTHING`,
              [userId, pathId]
            );

            if (certInsertResult.rowCount > 0) {
              console.log("[LOG /quiz/submit] ✅ Certificate issued successfully!");
            } else {
              console.log("[LOG /quiz/submit] Certificate already exists.");
            }
          } else {
            console.log(`[LOG /quiz/submit] Path not yet complete (${completedResources}/${totalResources}).`);
          }
        }
      } else {
        console.log(`[LOG /quiz/submit] Could not find path_id for resource ${resourceId}.`);
      }

      console.log("[LOG /quiz/submit] Committing transaction...");
      await client.query('COMMIT');
      console.log("[LOG /quiz/submit] Transaction committed.");
    }

    console.log("[LOG /quiz/submit] Sending score and pass status to frontend.");
    res.json({ score, passed });

  } catch (err) {
    console.error("!!! ERROR processing quiz submission:", err.message, err.stack);
    if (client) {
      console.log("[LOG /quiz/submit] Rolling back transaction...");
      await client.query('ROLLBACK');
    }
    if (!res.headersSent) {
      res.status(500).send("Server Error processing quiz submission.");
    }
  } finally {
    if (client) {
      console.log("[LOG /quiz/submit] Releasing client.");
      client.release();
    }
  }
});

// GET /api/learner/my-certificates
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

// 🎯 FIXED: GET /api/learner/certificate/:pathId - Download Certificate PDF
router.get("/certificate/:pathId", authMiddleware, async (req, res) => {
  const { pathId } = req.params;
  const { id: userId, name: userName } = req.user;
  console.log(`--- Handling GET /certificate/${pathId} for user ${userId} ---`);

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

    // 2. Verify certificate exists in Certificates table
    console.log("[LOG /certificate] Checking if certificate exists...");
    const certCheck = await pool.query(
      'SELECT * FROM Certificates WHERE user_id = $1 AND path_id = $2',
      [userId, pathId]
    );

    if (certCheck.rows.length === 0) {
      console.log("[LOG /certificate] No certificate found. User hasn't completed this path.");
      return res.status(403).json({ message: "Certificate not available. Complete the path first." });
    }

    console.log("[LOG /certificate] Certificate exists. Generating PDF...");

    // 3. Prepare PDF Data
    const learnerName = userName || 'Valued Learner';
    const issueDate = new Date(certCheck.rows[0].issue_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    console.log("[LOG /certificate] Generating PDF for:", learnerName, pathTitle);

    // 4. Create and Stream the PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });

    // Set headers BEFORE piping
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${pathId}.pdf"`);
    console.log("[LOG /certificate] Piping PDF document to response...");

    doc.pipe(res);

    // Add PDF Content - Beautiful Certificate Design
    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');
    
    // Border
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .lineWidth(3)
       .stroke('#0275d8');
    
    doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70)
       .lineWidth(1)
       .stroke('#0275d8');

    // Title
    doc.fontSize(50)
       .fillColor('#0275d8')
       .text('Certificate of Completion', 70, 100, { 
         align: 'center',
         width: doc.page.width - 140
       });
    
    doc.moveDown(2);

    // "This certifies that"
    doc.fontSize(20)
       .fillColor('#333333')
       .text('This certifies that', { align: 'center' });
    
    doc.moveDown(1.5);

    // Learner Name
    doc.fontSize(40)
       .fillColor('#d9534f')
       .text(learnerName, { 
         align: 'center',
         underline: true
       });
    
    doc.moveDown(1.5);

    // "has successfully completed"
    doc.fontSize(20)
       .fillColor('#333333')
       .text('has successfully completed the learning path:', { align: 'center' });
    
    doc.moveDown(1);

    // Path Title
    doc.fontSize(30)
       .fillColor('#0275d8')
       .text(pathTitle, { 
         align: 'center',
         width: doc.page.width - 140
       });
    
    doc.moveDown(3);

    // Issue Date
    doc.fontSize(18)
       .fillColor('#666666')
       .text(`Issue Date: ${issueDate}`, { align: 'center' });
    
    doc.moveDown(1);

    // Certificate ID
    doc.fontSize(14)
       .fillColor('#999999')
       .text(`Certificate ID: #${certCheck.rows[0].id}`, { align: 'center' });

    // Finalize
    console.log("[LOG /certificate] Finalizing PDF document...");
    doc.end();
    console.log("[LOG /certificate] PDF generation finished.");

  } catch (err) {
    console.error("!!! ERROR generating certificate:", err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server Error generating certificate." });
    }
  }
});

module.exports = router;