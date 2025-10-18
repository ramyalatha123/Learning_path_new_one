import React, { useEffect, useState, useContext } from "react";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import ProgressBar from "../learnerview/ProgressBar";
import "../../styles/learnerDashboard.css";

const LearnerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [learningPaths, setLearningPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPathId, setExpandedPathId] = useState(null);

  const fetchLearningPaths = async () => {
    try {
      const res = await API.get("/learner/learning-paths");
      setLearningPaths(res.data);
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
      setLearningPaths((prev) =>
        prev.map((path) =>
          path.id === pathId ? { ...path, registered: true } : path
        )
      );
    } catch (err) {
      console.error("Error registering path:", err.response || err);
    }
  };

  const completeResource = async (resourceId, pathId) => {
    try {
      await API.post(`/learner/complete-resource/${resourceId}`);
      setLearningPaths((prev) =>
        prev.map((path) => {
          if (path.id !== pathId) return path;
          const updatedResources = path.resources.map((r) =>
            r.id === resourceId ? { ...r, completed: true } : r
          );
          const completedCount = updatedResources.filter(r => r.completed).length;
          const progress = Math.round((completedCount / updatedResources.length) * 100);
          return {
            ...path,
            resources: updatedResources,
            progress,
            completed: progress === 100
          };
        })
      );
    } catch (err) {
      console.error("Error completing resource:", err.response || err);
    }
  };

  if (loading) return <p>Loading learning paths...</p>;

  return (
    <div className="learner-dashboard">
      <h2>Welcome, {user?.email}</h2>

      <div className="paths-container">
        {learningPaths.map((path) => (
          <div key={path.id} className="path-card">
            <div
              className="path-header"
              onClick={() =>
                setExpandedPathId(expandedPathId === path.id ? null : path.id)
              }
            >
              {/* DYNAMIC IMAGE */}
              <img 
  src={path.image_url ? path.image_url : '/assets/default_course.png'} 
  alt={path.title} 
  className="path-image" 
/>
              <div className="path-info">
                <h3>{path.title}</h3>
                <p>{path.short_description}</p>
                <ProgressBar progress={path.progress} />
                <p>{path.progress}% completed</p>
              </div>
            </div>

            {/* Resources */}
            {expandedPathId === path.id && path.registered && (
              <ul className="resources-list">
                {path.resources.map((res) => (
                  <li key={res.id} className="resource-item">
                    <div>
                      <strong>{res.title}</strong> - {res.description} - {res.estimated_time} mins
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
                          onClick={() => completeResource(res.id, path.id)}
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
            )}

            {/* Register button */}
            {!path.registered && (
              <button
                className="register-btn"
                onClick={() => registerPath(path.id)}
              >
                Register for this Path
              </button>
            )}

            {/* Certificate */}
            {path.completed && (
              <button className="certificate-btn">Download Certificate</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearnerDashboard;
