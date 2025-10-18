import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import "../../styles/Auth.css"; 


const Login = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); // clear previous errors

    // 1️⃣ Log the input values
    console.log("Submitting login:", { email, password });

    // 2️⃣ Basic validation
    if (!email || !password) {
      setErr("Email and password are required.");
      return;
    }

    try {
      const res = await API.post("/auth/login", { email, password });
      
      // 3️⃣ Log full response
      console.log("Login response:", res.data);

      // 4️⃣ Store user and token
      login(res.data);

      // 5️⃣ Navigate based on role (absolute paths)
      if (res.data.role === "creator") navigate("/Dashboard/CreatorDashboard");
      else if (res.data.role === "learner") navigate("/Dashboard/LearnerDashboard");
      else navigate("/");

    } catch (error) {
      // 6️⃣ Full error logging
      console.error("Login error full response:", error.response);

      // 7️⃣ Extract message safely
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Login failed";
      setErr(message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
        {err && <p style={{ color: "red" }}>{err}</p>}
      </form>
    </div>
  );
};

export default Login;
