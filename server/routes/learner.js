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

// --- GET /api/learner/path/:pathId WITH DEBUG LOGS ---
router.get("/path/:pathId", authMiddleware, async (req, res) => {
  const { pathId } = req.params;
  const { id: userId } = req.user;
  // Log start of request handling
  console.log(`--- Handling GET /path/${pathId} for user ${userId} ---`);

  try {
    // 1. Get the path details
    console.log("[LOG] Fetching path details from LearningPaths table...");
    const pathResult = await pool.query(
      "SELECT * FROM LearningPaths WHERE id = $1",
      [pathId]
    );
    // Log result count
    console.log(`[LOG] Path query result rows: ${pathResult.rows.length}`);

    // Check if path exists
    if (pathResult.rows.length === 0) {
      console.log(`[LOG] Path with ID ${pathId} not found. Sending 404.`); // Log 404 reason
      return res.status(404).json({ message: "Path not found" });
    }
    const path = pathResult.rows[0];
    // Log path found
    console.log(`[LOG] Path found: ${path.title} (ID: ${path.id})`);

    // 2. Get all resources for this path, in order
    console.log(`[LOG] Fetching resources for path ID ${pathId}...`);
    const resourcesResult = await pool.query(
      `SELECT r.*, p.completed AS is_completed
       FROM Resources r
       LEFT JOIN LearnerProgress p ON r.id = p.resource_id AND p.learner_id = $1
       WHERE r.path_id = $2
       ORDER BY r."order" ASC, r.id ASC`, // Ensure r."order" column exists
      [userId, pathId]
    );
    // Log resource count
    console.log(`[LOG] Resources query result rows: ${resourcesResult.rows.length}`);

    // Map resources and completion status
    path.resources = resourcesResult.rows.map(r => ({
      ...r,
      completed: !!r.is_completed // Convert null/undefined to false
    }));

    // Log before sending response
    console.log("[LOG] Sending final path object with resources to frontend.");
    res.json(path); // Send the complete path object

  } catch (err) {
    // Log any errors that occur during the process
    console.error(`!!! ERROR in GET /path/${pathId}:`, err.message, err.stack); // Log full error
    res.status(500).send("Server Error");
  }
});
// --- END OF MODIFIED ROUTE ---

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

// POST /api/learner/complete-resource/:id (Keep existing code)
router.post("/complete-resource/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "learner") return res.status(403).json({ message: "Access denied" });
    const resourceId = req.params.id;
    const learnerId = req.user.id;
    await pool.query(
      `INSERT INTO LearnerProgress (learner_id, resource_id, completed) VALUES ($1, $2, TRUE) ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`,
      [learnerId, resourceId]
    );
    res.json({ message: "Resource marked as completed" });
  } catch (err) { console.error(err); res.status(500).json({ message: "Server Error" }); }
});

// GET /api/learner/quiz/:resourceId (Keep existing code)
router.get("/quiz/:resourceId", authMiddleware, async (req, res) => {
  try {
    const { resourceId } = req.params;
    const questionsResult = await pool.query( 'SELECT id, question_text FROM Questions WHERE resource_id = $1', [resourceId] );
    const questions = questionsResult.rows;
    for (let q of questions) {
      const optionsResult = await pool.query( 'SELECT id, option_text FROM Options WHERE question_id = $1', [q.id] );
      q.options = optionsResult.rows;
    }
    res.json(questions);
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// GET /api/learner/certificate/:pathId (Keep existing code)
router.get("/certificate/:pathId", authMiddleware, async (req, res) => {
  try {
    const { pathId } = req.params;
    const { id: userId, name: userName } = req.user;
    const pathResult = await pool.query( "SELECT title FROM LearningPaths WHERE id = $1", [pathId] );
    if (pathResult.rows.length === 0) return res.status(404).json({ message: "Path not found." });
    const pathTitle = pathResult.rows[0].title;
    const progressResult = await pool.query( `SELECT (SELECT COUNT(*) FROM Resources WHERE path_id = $1) AS total, (SELECT COUNT(*) FROM LearnerProgress WHERE learner_id = $2 AND resource_id IN (SELECT id FROM Resources WHERE path_id = $1) AND completed = TRUE) AS completed`, [pathId, userId] );
    const { total, completed } = progressResult.rows[0];
    if (parseInt(total, 10) === 0 || parseInt(completed, 10) < parseInt(total, 10)) return res.status(403).json({ message: "Path not 100% complete." });
    const learnerName = userName || 'Valued Learner';
    const completionDate = new Date().toLocaleDateString();
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="certificate_${pathId}.pdf"`);
    doc.pipe(res);
    doc.fontSize(50).fillColor('#0275d8').text('Certificate of Completion', { align: 'center' }); doc.moveDown(2);
    doc.fontSize(24).fillColor('black').text('This certifies that', { align: 'center' }); doc.moveDown(1.5);
    doc.fontSize(40).fillColor('#d9534f').text(learnerName, { align: 'center' }); doc.moveDown(1.5);
    doc.fontSize(24).fillColor('black').text('has successfully completed the learning path:', { align: 'center' }); doc.moveDown(1);
    doc.fontSize(30).text(pathTitle, { align: 'center' }); doc.moveDown(3);
    doc.fontSize(20).text(`Completion Date: ${completionDate}`, { align: 'center' });
    doc.end();
  } catch (err) { console.error(err.message); res.status(500).send("Server Error"); }
});

// POST /api/learner/quiz/submit (Keep existing code)
router.post("/quiz/submit", authMiddleware, async (req, res) => {
  try {
    const { resourceId, answers } = req.body;
    const { id: userId } = req.user;
    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) return res.json({ score: 0, passed: false });
    const correctOptionsResult = await pool.query( `SELECT question_id, id as correct_option_id FROM Options WHERE question_id = ANY($1::int[]) AND is_correct = TRUE`, [questionIds] );
    const correctAnswers = {}; correctOptionsResult.rows.forEach(row => { correctAnswers[row.question_id] = row.correct_option_id; });
    let correctCount = 0; for (const questionId of questionIds) { if (answers[questionId] == correctAnswers[questionId]) { correctCount++; } }
    const score = Math.round((correctCount / questionIds.length) * 100);
    const passed = score >= 70;
    if (passed) { await pool.query( `INSERT INTO LearnerProgress (learner_id, resource_id, completed) VALUES ($1, $2, TRUE) ON CONFLICT (learner_id, resource_id) DO UPDATE SET completed = TRUE`, [userId, resourceId] ); }
    res.json({ score, passed });
  } catch (err) { console.error(err.message); res.status(500).send("Server Error"); }
});

module.exports = router; // Ensure this is the only export at the bottom