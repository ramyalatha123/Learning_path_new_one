require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// Initialize the app
const app = express();
const PORT = process.env.PORT || 5000;
const { createTables } = require('./db');
// --- Middleware ---
// Allow requests from other origins (your frontend)
app.use(cors()); 
// Allow the server to read JSON from request bodies
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));
createTables(); // <-- 1. ADD THIS LINE HERE

// --- Test Route ---
// This is just to make sure our server is working
// --- Routes ---
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const creatorRoutes = require("./routes/creator");
app.use("/api/creator", creatorRoutes);

const learnerRoutes = require("./routes/learner");
app.use("/api/learner", learnerRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);


const pathRoutes = require('./routes/paths');
app.use('/api/paths', pathRoutes);
// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});