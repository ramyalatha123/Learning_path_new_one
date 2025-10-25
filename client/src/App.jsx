import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./components/Home";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import CreatorDashboard from "./components/Dashboard/CreatorDashboard"; // NEW
import CreatePathPage from "./components/Dashboard/CreatePathPage";
import ViewPathPage from "./components/Dashboard/ViewPathPage"; // NEW
import LearnerDashboard from "./components/Dashboard/LearnerDashboard";
import ProtectedRoute from "./components/Shared/ProtectedRoute";
import PathViewer from "./components/learnerview/PathViewer";
import Quiz from "./components/learnerview/Quiz";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import MyCertificates from "./components/Dashboard/MyCertificates";
import PathDetails from "./components/learnerview/PathDetails";
import EditPathPage from "./components/Dashboard/EditPathPage";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* NEW Creator Dashboard Routes */}
      <Route
        path="/dashboard/CreatorDashboard"
        element={
          <ProtectedRoute roles={["creator"]}>
            <CreatorDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/creator/create-path"
        element={
          <ProtectedRoute roles={["creator"]}>
            <CreatePathPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/creator/view-path/:pathId"
        element={
          <ProtectedRoute roles={["creator"]}>
            <ViewPathPage />
          </ProtectedRoute>
        }
      />

      {/* Learner Dashboard Route */}
      <Route
        path="/Dashboard/LearnerDashboard/*"
        element={
          <ProtectedRoute roles={["learner"]}>
            <LearnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Path Viewer Route */}
      <Route
        path="/path/view/:pathId"
        element={
          <ProtectedRoute roles={["learner","creator"]}>
            <PathViewer />
          </ProtectedRoute>
        }
      />

      {/* Quiz Route */}
      <Route
        path="/quiz/:resourceId"
        element={
          <ProtectedRoute roles={["learner"]}>
            <Quiz />
          </ProtectedRoute>
        }
      />

      {/* Path Details Route */}
      <Route
        path="/path/details/:pathId"
        element={
          <ProtectedRoute roles={["learner", "creator"]}>
            <PathDetails />
          </ProtectedRoute>
        }
      />

      <Route
  path="/dashboard/creator/edit-path/:pathId"
  element={
    <ProtectedRoute roles={["creator"]}>
      <EditPathPage />
    </ProtectedRoute>
  }
/>

      {/* My Certificates Route */}
      <Route
        path="/my-certificates"
        element={
          <ProtectedRoute roles={["learner"]}>
            <MyCertificates />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;