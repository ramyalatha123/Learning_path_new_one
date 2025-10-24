import React from "react";
// Import Routes and Route, but NOT BrowserRouter
import { Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import CreatorDashboard from "./components/Dashboard/CreatorDashboard";
import LearnerDashboard from "./components/Dashboard/LearnerDashboard";
import ProtectedRoute from "./components/Shared/ProtectedRoute";
import PathViewer from "./components/learnerview/PathViewer";
import Quiz from "./components/learnerview/Quiz"; 
import AdminDashboard from "./components/Dashboard/AdminDashboard"; // <-- 1. IMPORT ADMIN DASHBOARD
import MyCertificates from "./components/Dashboard/MyCertificates";
import PathDetails from "./components/learnerview/PathDetails";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* --- 2. ADD THIS NEW ADMIN ROUTE --- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      {/* --- END OF NEW ROUTE --- */}

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

      <Route
        path="/path/view/:pathId"
        element={
          <ProtectedRoute roles={["learner","creator"]}>
            <PathViewer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quiz/:resourceId"
        element={
          <ProtectedRoute roles={["learner"]}>
            <Quiz />
          </ProtectedRoute>
        }
      />
      <Route
    path="/path/details/:pathId"
    element={
        <ProtectedRoute roles={["learner", "creator"]}>
            <PathDetails /> 
        </ProtectedRoute>
    }
/>


      {/* --- ADD THIS NEW CERTIFICATES ROUTE --- */}
      <Route
        path="/my-certificates"
        element={
          <ProtectedRoute roles={["learner"]}> {/* Or maybe all roles? */}
            <MyCertificates />
          </ProtectedRoute>
        }
      />
      {/* --- END OF NEW ROUTE --- */}
    </Routes>
  );
}

export default App;