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
  const [enrolledPaths, setEnrolledPaths] = useState([]);
  const [recommendedPaths, setRecommendedPaths] = useState([]);

  const fetchLearningPaths = async () => {
    try {
      const res = await API.get("/learner/learning-paths");
      const allPaths = res.data;
      const enrolled = allPaths.filter(path => path.registered);
      const recommended = allPaths.filter(path => !path.registered);
      setEnrolledPaths(enrolled);
      setRecommendedPaths(recommended);
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
      fetchLearningPaths(); 
    } catch (err) {
      console.error("Error registering path:", err.response || err);
    }
  };

  if (loading) return <p>Loading learning paths...</p>;

  // PathCard helper component remains the same
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
          {path.registered && (
            <>
              <ProgressBar progress={path.progress} />
              <p>{path.progress}% completed</p>
            </>
          )}
        </div>
      </div>
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

  return (
    // Main container - becomes the flex container
    <div className="learner-dashboard"> 
      
      {/* --- TOP HEADER SECTION --- */}
      <div className="dashboard-header"> {/* Wrap header content */}
        <h2>Welcome back, {user?.name || user?.email}</h2>
        {/* You could add other elements like profile icon, settings etc. here */}
      </div>

      {/* --- SCROLLABLE CONTENT AREA --- */}
      <div className="dashboard-content"> {/* Wrap course sections */}
        
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
        
      </div> {/* End scrollable content */}
    </div> // End main container
  );
};

export default LearnerDashboard;