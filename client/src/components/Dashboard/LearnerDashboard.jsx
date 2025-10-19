import React, { useEffect, useState, useContext } from "react";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import ProgressBar from "../learnerview/ProgressBar";
import "../../styles/learnerDashboard.css";
import { useNavigate } from "react-router-dom";

const LearnerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- NEW STATE ---
  // We will have two separate lists
  const [enrolledPaths, setEnrolledPaths] = useState([]);
  const [recommendedPaths, setRecommendedPaths] = useState([]);
  // ---

  const fetchLearningPaths = async () => {
    try {
      const res = await API.get("/learner/learning-paths");
      const allPaths = res.data;

      // --- NEW LOGIC ---
      // Filter the paths into two lists
      const enrolled = allPaths.filter(path => path.registered);
      const recommended = allPaths.filter(path => !path.registered);
      
      setEnrolledPaths(enrolled);
      setRecommendedPaths(recommended);
      // ---
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching learning paths:", err.response || err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  const registerPath = async (pathId) => {
    try {
      await API.post("/learner/register-path", { path_id: pathId });
      // After registering, refetch all paths to update the lists
      fetchLearningPaths(); 
    } catch (err) {
      console.error("Error registering path:", err.response || err);
    }
  };

  if (loading) return <p>Loading learning paths...</p>;

  // --- HELPER COMPONENT ---
  // To avoid writing the card code twice, we can make a small component.
  const PathCard = ({ path }) => (
    <div 
      key={path.id} 
      className="path-card"
      onClick={() => navigate(`/path/${path.id}`)}
    >
      <div className="path-header">
        <img
          src={path.image_url ? path.image_url : '/assets/default_course.png'}
          alt={path.title}
          className="path-image"
        />
        <div className="path-info">
          <h3>{path.title}</h3>
          <p>{path.short_description}</p>
          {/* Only show progress if they are registered */}
          {path.registered && (
            <>
              <ProgressBar progress={path.progress} />
              <p>{path.progress}% completed</p>
            </>
          )}
        </div>
      </div>

      {/* Show "Register" button if NOT registered */}
      {!path.registered && (
        <button
          className="register-btn"
          onClick={(e) => {
            e.stopPropagation();
            registerPath(path.id);
          }}
        >
          Register for this Path
        </button>
      )}

      {/* Show "Certificate" button if COMPLETED */}
      {path.completed && (
        <a
          href={`${API.defaults.baseURL}/learner/certificate/${path.id}?token=${localStorage.getItem('token')}`}
          className="certificate-btn"
          onClick={(e) => e.stopPropagation()} 
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', textAlign: 'center' }}
        >
          Download Certificate
        </a>
      )}
    </div>
  );

  // --- NEW JSX LAYOUT ---
  return (
    <div className="learner-dashboard">
      <h2>Welcome, {user?.name || user?.email}</h2> {/* Shows name if available */}

      {/* --- SECTION 1: PICK UP WHERE YOU LEFT OFF --- */}
      <h3>Pick up where you left off</h3>
      <div className="paths-container">
        {enrolledPaths.length > 0 ? (
          enrolledPaths.map(path => (
            <PathCard path={path} key={path.id} />
          ))
        ) : (
          <p>You are not enrolled in any paths. Explore below!</p>
        )}
      </div>

      {/* --- SECTION 2: RECOMMENDED FOR YOU --- */}
      <h3>Recommended for you</h3>
      <div className="paths-container">
        {recommendedPaths.length > 0 ? (
          recommendedPaths.map(path => (
            <PathCard path={path} key={path.id} />
          ))
        ) : (
          <p>You've enrolled in all available paths!</p>
        )}
      </div>
    </div>
  );
};

export default LearnerDashboard;