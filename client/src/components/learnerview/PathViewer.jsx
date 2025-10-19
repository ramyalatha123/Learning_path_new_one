import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // <-- 1. IMPORT LINK
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import '../../styles/PathViewer.css';// You can create a CSS file for this

const PathViewer = () => {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the single path's data
  const fetchPath = async () => {
    try {
      const res = await API.get(`/learner/path/${pathId}`);
      setPath(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching path details:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPath();
  }, [pathId]);

  // Function to mark a resource as complete
  const completeResource = async (resourceId) => {
    try {
      await API.post(`/learner/complete-resource/${resourceId}`);
      
      setPath(prevPath => {
        const updatedResources = prevPath.resources.map(r => 
          r.id === resourceId ? { ...r, completed: true } : r
        );
        return { ...prevPath, resources: updatedResources };
      });

    } catch (err) {
      console.error("Error completing resource:", err.response || err);
    }
  };

  if (loading) {
    return <div>Loading path details...</div>;
  }

  if (!path) {
    return <div>Path not found.</div>;
  }

  // Calculate progress
  const completedCount = path.resources.filter(r => r.completed).length;
  const totalCount = path.resources.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="path-viewer-container">
      <button onClick={() => navigate("/Dashboard/LearnerDashboard")}>
        &larr; Back to Dashboard
      </button>

      <h1>{path.title}</h1>
      <p>{path.description}</p>
      
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <p>{progress}% Complete</p>

      <h3>Resources</h3>
      <ul className="resources-list">
        {path.resources.map((res) => (
          <li key={res.id} className="resource-item">
            <div>
              <strong>{res.title} ({res.type})</strong> {/* <-- Show the type */}
              <p>{res.description} ({res.estimated_time} mins)</p>
            </div>
            <div className="resource-buttons">

              {/* --- 2. THIS IS THE NEW LOGIC --- */}
              {res.type === 'video' || res.type === 'article' ? (
                // If it's a video/article, show the "Continue" <a> link
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="continue-btn"
                >
                  Continue Learning
                </a>
              ) : (
                // If it's a quiz, show the "Start Quiz" <Link>
                <Link 
                  to={`/quiz/${res.id}`} 
                  className="continue-btn"
                >
                  Start Quiz
                </Link>
              )}
              {/* --- END OF NEW LOGIC --- */}

              {!res.completed ? (
                <button
                  onClick={() => completeResource(res.id)}
                  className="complete-btn"
                >
                  Mark Completed
                </button>
              ) : (
                <span className="completed-label">Completed</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PathViewer;