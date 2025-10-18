import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./components/Home"; // ✅ import Home
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import CreatorDashboard from "./components/Dashboard/CreatorDashboard";
import LearnerDashboard from "./components/Dashboard/LearnerDashboard";
import ProtectedRoute from "./components/Shared/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />   {/* <-- Home page */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route 
          path="/Dashboard/CreatorDashboard/*" 
          element={
            <ProtectedRoute roles={["creator"]}>
              <CreatorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/Dashboard/LearnerDashboard/*" 
          element={
            <ProtectedRoute roles={["learner"]}>
              <LearnerDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
