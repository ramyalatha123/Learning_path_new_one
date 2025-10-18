import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import "../../styles/Auth.css"; 
const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "learner",
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
      await API.post("/auth/signup", form);
      setMessage("Signup successful! Redirecting to login...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
        console.log(err)
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <h2>Create an Account</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          required
        />
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

        <select
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="learner">Learner</option>
          <option value="creator">Creator</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit">Sign Up</button>

        {message && <p className="success-msg">{message}</p>}
        {error && <p className="error-msg">{error}</p>}
      </form>

      <p>
        Already have an account?{" "}
        <span className="link" onClick={() => navigate("/")}>
          Login here
        </span>
      </p>
    </div>
  );
};

export default Signup;
