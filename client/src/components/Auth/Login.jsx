import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import "../../styles/Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

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
      const res = await API.post("/auth/login", form);
      login(res.data);

      setMessage("Login successful! Redirecting...");

      const userRole = res.data.user.role;

      if (userRole === "creator") {
        navigate("/Dashboard/CreatorDashboard");
      } else if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/Dashboard/LearnerDashboard");
      }
    } catch (err) {
      console.error("Login Error:", err.response || err);
      setError(err.response?.data?.message || "Login failed. Please check credentials.");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <h2>Login to Your Account</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Enter Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Enter Password"
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
    </div>
  );
};

export default Login;
