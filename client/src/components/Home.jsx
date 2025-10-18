import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="home-container">
      <div className="overlay">
        <h1 className="fade-in">Welcome to Learning Platform</h1>
        <p className="fade-in delay-1">Learn, Create, and Grow</p>
        <div className="buttons fade-in delay-2">
          <button onClick={() => navigate("/login")}>Login</button>
          <button onClick={() => navigate("/signup")}>Signup</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
