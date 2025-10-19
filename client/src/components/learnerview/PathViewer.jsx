import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
// import './PathViewer.css'; // You can create a CSS file for this

const PathViewer = () => {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the single path's data
  const fetchPath = async () => {
    try {
      // This API route now exists!
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
      
      // Update the state locally for a fast UI response
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
    // This is the "Path not found" you were seeing
    return <div>Path not found.</div>;
  }

  // Calculate progress
  const completedCount = path.resources.filter(r => r.completed).length;
  const totalCount = path.resources.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="path-viewer-container"> {/* Add styles for this class */ }
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
              <strong>{res.title}</strong>
              <p>{res.description} ({res.estimated_time} mins)</p>
            </div>
            <div className="resource-buttons">
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="continue-btn"
              >
                Continue Learning
              </a>
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