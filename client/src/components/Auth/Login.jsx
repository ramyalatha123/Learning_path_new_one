import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api"; // Make sure this path is correct
import { AuthContext } from "../../context/AuthContext"; // Make sure this path is correct
import "../../styles/Auth.css"; // Make sure this path is correct

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Get the login function from context

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      // 1. Send login request to backend
      const res = await API.post("/auth/login", form);

      // 2. Call the login function from AuthContext to save user data
      // Ensure your context's login function expects { token: '...', user: {...} }
      login(res.data); 

      // 3. --- THIS IS THE UPDATED NAVIGATION LOGIC ---
      setMessage("Login successful! Redirecting...");
      
      // Get the role from the response data
      const userRole = res.data.user.role; 
      
      // Navigate based on the user's role
      if (userRole === "creator") {
        navigate("/Dashboard/CreatorDashboard");
      } else if (userRole === "admin") { 
        navigate("/admin"); // Navigate admins to /admin
      } else { 
        // Default to learner dashboard for any other role (or if role is missing)
        navigate("/Dashboard/LearnerDashboard"); 
      }
      // --- END OF UPDATED LOGIC ---

    } catch (err) {
      console.error("Login Error:", err.response || err); // Log the full error
      setError(err.response?.data?.message || "Login failed. Please check credentials.");
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Your Account</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit">Login</button>

        {message && <p className="success-msg">{message}</p>}
        {error && <p className="error-msg">{error}</p>}
      </form>

      <p>
        Don't have an account?{" "}
        <Link to="/signup" className="link">
          Sign up here
        </Link>
      </p>
    </div>
  );
};

export default Login;