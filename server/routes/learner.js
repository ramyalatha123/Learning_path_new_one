const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const PDFDocument = require('pdfkit');
const authMiddleware = require('../middleware/auth');

// GET all learning paths with resources & progress
router.get("/learning-paths", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });

    const pathsResult = await pool.query(`
      SELECT id, title, image_url, short_description, created_at 
      FROM LearningPaths 
      ORDER BY created_at ASC
    `);
    const paths = pathsResult.rows;
    const learnerId = req.user.id; // Get the learner's ID

    for (let path of paths) {
      // --- THIS IS THE NEW CODE ---
      // 1. Check if user is registered for this path
      const registrationCheck = await pool.query(
        "SELECT * FROM LearnerLearningPaths WHERE learner_id = $1 AND path_id = $2",
        [learnerId, path.id]
      );
      // Add a true/false flag to the path object
      path.registered = registrationCheck.rows.length > 0;
      // --- END OF NEW CODE ---

      // 2. get resources for this path
      const resourcesRes = await pool.query(
        "SELECT r.*, lp.completed FROM Resources r LEFT JOIN LearnerProgress lp ON r.id = lp.resource_id AND lp.learner_id = $1 WHERE r.path_id = $2",
        [learnerId, path.id]
      );
      path.resources = resourcesRes.rows;

      // 3. calculate progress
      const total = path.resources.length;
      const completed = path.resources.filter(r => r.completed).length;
      path.progress = total ? Math.round((completed / total) * 100) : 0;
      path.completed = path.progress === 100;
    }

    res.json(paths);
  } catch (err) {
    console.error("Error fetching learning paths:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/learner/path/:pathId
router.get("/path/:pathId", authMiddleware, async (req, res) => {
  const { pathId } = req.params;
  const { id: userId } = req.user;

  try {
    const pathResult = await pool.query(
      "SELECT * FROM LearningPaths WHERE id = $1",
      [pathId]
    );
    if (pathResult.rows.length === 0) {
      return res.status(404).json({ message: "Path not found" });
    }
    const path = pathResult.rows[0];

    const resourcesResult = await pool.query(
      `SELECT r.*, p.completed AS is_completed
       FROM Resources r
       LEFT JOIN LearnerProgress p ON r.id = p.resource_id AND p.learner_id = $1
       WHERE r.path_id = $2
       ORDER BY r.id ASC`,
      [userId, pathId]
    );

    path.resources = resourcesResult.rows.map(r => ({
      ...r,
      completed: !!r.is_completed
    }));

    res.json(path);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// POST /api/learner/register-path
router.post("/register-path", authMiddleware, async (req, res) => {
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

// POST /api/learner/complete-resource/:id
router.post("/complete-resource/:id", authMiddleware, async (req, res) => {
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

// GET /api/learner/quiz/:resourceId
// Fetches all questions and options for a quiz (without answers)
router.get("/quiz/:resourceId", authMiddleware, async (req, res) => {
  const { resourceId } = req.params;
  try {
    // 1. Get all questions for the quiz
    const questionsResult = await pool.query(
      'SELECT id, question_text FROM Questions WHERE resource_id = $1',
      [resourceId]
    );
    const questions = questionsResult.rows;

    // 2. For each question, get its options
    for (let q of questions) {
      const optionsResult = await pool.query(
        // We do NOT send the 'is_correct' column to the user
        'SELECT id, option_text FROM Options WHERE question_id = $1',
        [q.id]
      );
      q.options = optionsResult.rows;
    }

    res.json(questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/learner/certificate/:pathId
router.get("/certificate/:pathId", authMiddleware, async (req, res) => {
  const { pathId } = req.params;
  const { id: userId, name: userName } = req.user;

  try {
    const pathResult = await pool.query(
      "SELECT title FROM LearningPaths WHERE id = $1",
      [pathId]
    );
    if (pathResult.rows.length === 0) {
      return res.status(404).json({ message: "Path not found." });
    }
    const pathTitle = pathResult.rows[0].title;

    const progressResult = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM Resources WHERE path_id = $1) AS total,
         (SELECT COUNT(*) FROM LearnerProgress WHERE learner_id = $2 AND resource_id IN 
           (SELECT id FROM Resources WHERE path_id = $1) AND completed = TRUE) AS completed`,
      [pathId, userId]
    );

    const { total, completed } = progressResult.rows[0];
    if (parseInt(total, 10) === 0 || parseInt(completed, 10) < parseInt(total, 10)) {
      return res.status(403).json({ message: "Path not 100% complete." });
    }
    
    const learnerName = userName || 'Valued Learner';
    const completionDate = new Date().toLocaleDateString();

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${pathId}.pdf"`);

    doc.pipe(res);

    doc.fontSize(50).fillColor('#0275d8').text('Certificate of Completion', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(24).fillColor('black').text('This certifies that', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(40).fillColor('#d9534f').text(learnerName, { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(24).fillColor('black').text('has successfully completed the learning path:', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(30).text(pathTitle, { align: 'center' });
    doc.moveDown(3);
    doc.fontSize(20).text(`Completion Date: ${completionDate}`, { align: 'center' });
    
    doc.end();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// POST /api/learner/quiz/submit
// Checks quiz answers and returns a score
router.post("/quiz/submit", authMiddleware, async (req, res) => {
  const { resourceId, answers } = req.body; // answers is { "questionId": "optionId", ... }
  const { id: userId } = req.user;

  try {
    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      return res.json({ score: 0, passed: false });
    }

    // Get all the *correct* options for these questions
    const correctOptionsResult = await pool.query(
      `SELECT question_id, id as correct_option_id
       FROM Options
       WHERE question_id = ANY($1::int[]) AND is_correct = TRUE`,
      [questionIds]
    );

    const correctAnswers = {};
    correctOptionsResult.rows.forEach(row => {
      correctAnswers[row.question_id] = row.correct_option_id;
    });

    // Compare user's answers to correct answers
    let correctCount = 0;
    for (const questionId of questionIds) {
      // User's answer was correct
      if (answers[questionId] == correctAnswers[questionId]) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / questionIds.length) * 100);
    const passed = score >= 70; // You can set any passing score

    // If they passed, also mark the resource as complete
    if (passed) {
      await pool.query(
        `INSERT INTO LearnerProgress (learner_id, resource_id, completed)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`,
        [userId, resourceId]
      );
    }

    res.json({ score, passed });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router; // This should be at the very bottom

module.exports = router;