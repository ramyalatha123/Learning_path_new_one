import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom"; 
import API from "../../api";
import { AuthContext } from "../../context/AuthContext"; 
import '../../styles/PathViewer.css'; 

const PathViewer = () => {
    const { pathId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); 
    
    // CHECK FOR PREVIEW MODE STATE
    const isPreviewMode = location.state?.preview === true;
    
    const [path, setPath] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- UPDATED fetchPath FUNCTION (The Fix) ---
    const fetchPath = async () => {
        console.log("useEffect running for pathId:", pathId); 
        if (!pathId) {
            console.error("No pathId found in URL!");
            setLoading(false);
            return;
        }
        try {
            setLoading(true); 
            console.log("Attempting to fetch:", `/paths/view/${pathId}`); // Updated log
        
        // *** CRITICAL CHANGE: Use the new /paths/view route ***
        const res = await API.get(`/paths/view/${pathId}`); 
            console.log("API Response:", res.data); 
            setPath(res.data);
            setLoading(false);
        } catch (err) {
            // This ensures we catch the 403 error gracefully
            if (err.response && err.response.status === 403) {
                console.error("Access Denied to fetch path:", err.response.data.message);
                // Show a clear message instead of just "Path not found."
                alert("Access Denied: You do not have permission to view this path."); 
            }
            console.error("Error fetching path details:", err);
            setLoading(false); 
        }
    };
    // --- END fetchPath FUNCTION ---

    // The completion function should not run in preview mode, but we will protect it in the render logic
    const completeResource = async (resourceId) => {
        if (isPreviewMode) {
            alert("Cannot mark resources complete in Preview Mode.");
            return;
        }
        try {
            console.log("Attempting to complete resource:", resourceId); 
            await API.post(`/learner/complete-resource/${resourceId}`);
            console.log("Resource completion successful, updating state..."); 

            // Update the state locally for immediate feedback
            setPath(prevPath => {
                if (!prevPath) return null; 
                const updatedResources = prevPath.resources.map(r =>
                    r.id === resourceId ? { ...r, completed: true } : r
                );
                 const newCompletedCount = updatedResources.filter(r => r.completed).length;
                 const newTotalCount = updatedResources.length;
                 const newProgress = newTotalCount > 0 ? Math.round((newCompletedCount / newTotalCount) * 100) : 0;
                 console.log("New Progress:", newProgress); 

                return { ...prevPath, resources: updatedResources };
            });

        } catch (err) {
            console.error("Error completing resource:", err.response || err); 
        }
    };
    // --- END completeResource FUNCTION ---

    // Fetch data when component mounts or pathId changes
    useEffect(() => {
        fetchPath();
    }, [pathId]);


    if (loading) return <div>Loading path details...</div>;
    if (!path) return <div>Path not found.</div>;

    // Calculate progress 
    const completedCount = path.resources.filter(r => r.completed).length;
    const totalCount = path.resources.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="path-viewer-layout">

            {/* PREVIEW MODE BANNER */}
            {isPreviewMode && (
                <div className="preview-mode-banner">
                    PREVIEW MODE: This is a **read-only view**. Progress tracking and enrollment are disabled.
                </div>
            )}

            {/* --- Header Section (Non-Scrollable) --- */}
            <div className="path-viewer-header">
                {/* Adjust navigation based on context */}
                <button onClick={() => isPreviewMode ? navigate("/Dashboard/CreatorDashboard") : navigate("/Dashboard/LearnerDashboard")}>
                    &larr; Back to {isPreviewMode ? 'Creator Dashboard' : 'Dashboard'}
                </button>
                <h1>{path.title}</h1>
                <p>{path.description || path.short_description}</p> 
                
                {/* Hide progress elements if in preview mode */}
                {!isPreviewMode && (
                    <>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="progress-text">{progress}% Complete</p>
                    </>
                )}
            </div>
            {/* --- End Header --- */}

            {/* --- Scrollable Content Area --- */}
            <div className="path-viewer-content">
                <h3>Resources</h3>
                <ul className="resources-list">
                    {path.resources && path.resources.length > 0 ? (
                        path.resources.map((res) => (
                            <li key={res.id} className={`resource-item ${res.completed && !isPreviewMode ? 'completed' : ''}`}>
                                {/* --- Resource Details --- */}
                                <div className="resource-details">
                                    <strong>{res.title} ({res.type || 'N/A'})</strong> 
                                    <p>{res.description} ({res.estimated_time || 0} mins)</p>
                                </div>
                                {/* --- Resource Buttons --- */}
                                <div className="resource-buttons">
                                    {res.type === 'video' || res.type === 'article' ? (
                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="continue-btn">
                                            Continue Learning
                                        </a>
                                    ) : res.type === 'quiz' ? ( 
                                        <Link 
                                            // The quiz link is always visible in Preview, but the quiz logic must handle no progress saving.
                                            to={`/quiz/${res.id}${isPreviewMode ? '?preview=true' : ''}`} 
                                            className="continue-btn"
                                        >
                                            {isPreviewMode ? 'View Quiz' : 'Start Quiz'}
                                        </Link>
                                    ) : (
                                         <span>(No action needed)</span> 
                                    )}
                                
                                {/* CONDITIONAL BUTTON RENDERING */}
                                {isPreviewMode ? (
                                    <button disabled className="btn-disabled">
                                        Disabled in Preview
                                    </button>
                                ) : (
                                    !res.completed ? (
                                        <button onClick={() => completeResource(res.id)} className="complete-btn">
                                            Mark Completed
                                        </button>
                                    ) : (
                                        <span className="completed-label">Completed</span>
                                    )
                                )}
                                </div>
                            </li>
                        ))
                     ) : (
                         <p>No resources found for this path.</p> 
                     )}
                </ul>
            </div>
        </div> 
    );
};

export default PathViewer;