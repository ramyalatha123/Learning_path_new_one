import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api"; // Make sure this path is correct
import { AuthContext } from "../../context/AuthContext"; // Make sure this path is correct
import "../../styles/Auth.css"; // Make sure this path is correct

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Get the login function

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

      // 2. Call the login function from AuthContext
      // res.data is { token: "...", user: { ... } }
      login(res.data);

      // 3. --- THIS IS THE FIX ---
      // Navigate to the correct dashboard based on the user's role
      setMessage("Login successful! Redirecting...");
      if (res.data.user.role === "creator") {
        navigate("/Dashboard/CreatorDashboard");
      } else {
        navigate("/Dashboard/LearnerDashboard");
      }

    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Login failed. Please try again.");
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