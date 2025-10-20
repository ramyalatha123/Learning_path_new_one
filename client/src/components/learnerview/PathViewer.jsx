import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext"; // Keep context if needed
import '../../styles/PathViewer.css'; // Make sure CSS is imported

const PathViewer = () => {
    const { pathId } = useParams();
    const navigate = useNavigate();
    // const { user } = useContext(AuthContext); // Can uncomment if needed later
    const [path, setPath] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- THIS IS THE CORRECT fetchPath FUNCTION ---
    const fetchPath = async () => {
        console.log("useEffect running for pathId:", pathId); // Debug log
        if (!pathId) {
            console.error("No pathId found in URL!");
            setLoading(false);
            return;
        }
        try {
            setLoading(true); // Ensure loading is true initially
            console.log("Attempting to fetch:", `/learner/path/${pathId}`); // Debug log
            const res = await API.get(`/learner/path/${pathId}`);
            console.log("API Response:", res.data); // Debug log
            setPath(res.data);
            setLoading(false); // <--- THIS IS IMPORTANT
        } catch (err) {
            console.error("Error fetching path details:", err); // Debug log error
            setLoading(false); // <--- THIS IS IMPORTANT
        }
    };
    // --- END fetchPath FUNCTION ---

    // --- THIS IS THE CORRECT completeResource FUNCTION ---
     const completeResource = async (resourceId) => {
        try {
            console.log("Attempting to complete resource:", resourceId); // Debug log
            await API.post(`/learner/complete-resource/${resourceId}`);
            console.log("Resource completion successful, updating state..."); // Debug log

            // Update the state locally for immediate feedback
            setPath(prevPath => {
                if (!prevPath) return null; // Safety check
                const updatedResources = prevPath.resources.map(r =>
                    r.id === resourceId ? { ...r, completed: true } : r
                );
                 // Recalculate progress after update
                 const newCompletedCount = updatedResources.filter(r => r.completed).length;
                 const newTotalCount = updatedResources.length;
                 const newProgress = newTotalCount > 0 ? Math.round((newCompletedCount / newTotalCount) * 100) : 0;
                 console.log("New Progress:", newProgress); // Debug log

                return { ...prevPath, resources: updatedResources };
            });

        } catch (err) {
            console.error("Error completing resource:", err.response || err); // Debug log error
        }
    };
    // --- END completeResource FUNCTION ---

    // Fetch data when component mounts or pathId changes
    useEffect(() => {
        fetchPath();
    }, [pathId]);


    if (loading) return <div>Loading path details...</div>;
    // Show "Path not found" only AFTER loading is false AND path is still null
    if (!path) return <div>Path not found.</div>;

    // Calculate progress (this is fine)
    const completedCount = path.resources.filter(r => r.completed).length;
    const totalCount = path.resources.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        // --- Main container for flex layout ---
        <div className="path-viewer-layout">

            {/* --- Header Section (Non-Scrollable) --- */}
            <div className="path-viewer-header">
                <button onClick={() => navigate("/Dashboard/LearnerDashboard")}>
                    &larr; Back to Dashboard
                </button>
                <h1>{path.title}</h1>
                 {/* Display full description from DB if available */}
                <p>{path.description || path.short_description}</p> 
                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="progress-text">{progress}% Complete</p>
            </div>
            {/* --- End Header --- */}

            {/* --- Scrollable Content Area --- */}
            <div className="path-viewer-content">
                <h3>Resources</h3>
                <ul className="resources-list">
                    {/* Check if resources exist before mapping */}
                    {path.resources && path.resources.length > 0 ? (
                        path.resources.map((res) => (
                            <li key={res.id} className="resource-item">
                                {/* --- Resource Details --- */}
                                <div className="resource-details">
                                    <strong>{res.title} ({res.type || 'N/A'})</strong> {/* Added type */}
                                    {/* Display full description from DB */}
                                    <p>{res.description} ({res.estimated_time || 0} mins)</p>
                                </div>
                                {/* --- Resource Buttons --- */}
                                <div className="resource-buttons">
                                    {res.type === 'video' || res.type === 'article' ? (
                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="continue-btn">
                                            Continue Learning
                                        </a>
                                    ) : res.type === 'quiz' ? ( // Check for quiz type
                                        <Link to={`/quiz/${res.id}`} className="continue-btn">
                                            Start Quiz
                                        </Link>
                                    ) : (
                                         <span>(No action needed)</span> // Fallback for unknown type
                                    )}
                                    {!res.completed ? (
                                        <button onClick={() => completeResource(res.id)} className="complete-btn">
                                            Mark Completed
                                        </button>
                                    ) : (
                                        <span className="completed-label">Completed</span>
                                    )}
                                </div>
                            </li>
                        ))
                     ) : (
                         <p>No resources found for this path.</p> // Message if no resources
                     )}
                </ul>
            </div>
            {/* --- End Scrollable Content --- */}
        </div> // End main layout
    );
};

export default PathViewer;