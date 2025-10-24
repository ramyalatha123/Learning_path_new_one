import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; 
import API from "../../api";
import '../../styles/PathViewer.css'; 

const PathViewer = () => {
    const { pathId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); 
    
    const isPreviewMode = location.state?.preview === true;
    
    const [path, setPath] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentResourceIndex, setCurrentResourceIndex] = useState(0);

    // 🎯 FIX: Convert YouTube URL to embed format
    const getEmbedUrl = (url) => {
        if (!url) return '';
        
        // If already an embed URL, return as is
        if (url.includes('/embed/')) return url;
        
        // Extract video ID from various YouTube URL formats
        let videoId = '';
        
        // Format: https://www.youtube.com/watch?v=VIDEO_ID
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('watch?v=')[1]?.split('&')[0];
        }
        // Format: https://youtu.be/VIDEO_ID
        else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }
        // Format: https://www.youtube.com/embed/VIDEO_ID (already correct)
        else if (url.includes('youtube.com/embed/')) {
            return url;
        }
        
        // Return embed URL if video ID found, otherwise return original
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    };

    const fetchPath = async () => {
        console.log("Fetching path for ID:", pathId); 
        if (!pathId) {
            console.error("No pathId found!");
            setLoading(false);
            return;
        }
        try {
            setLoading(true); 
            const res = await API.get(`/paths/view/${pathId}`); 
            console.log("Path data received:", res.data); 
            setPath(res.data);
            setLoading(false);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                alert("Access Denied: You do not have permission to view this path."); 
            }
            console.error("Error fetching path:", err);
            setLoading(false); 
        }
    };

    const completeResource = async (resourceId) => {
        if (isPreviewMode) return;
        
        try {
            console.log(`Completing resource: ${resourceId}`);
            await API.post(`/learner/complete-resource/${resourceId}`);

            setPath(prevPath => {
                if (!prevPath) return null;

                const updatedResources = prevPath.resources.map(r =>
                    r.id === resourceId ? { ...r, completed: true } : r
                );

                return { ...prevPath, resources: updatedResources };
            });
            
            if (currentResourceIndex < path.resources.length - 1) {
                setCurrentResourceIndex(currentResourceIndex + 1);
            }
        } catch (err) {
            console.error("Error completing resource:", err);
        }
    };

    useEffect(() => {
        fetchPath();
    }, [pathId]);

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your course...</p>
        </div>
    );
    
    if (!path) return (
        <div className="error-container">
            <h2>Path not found</h2>
            <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
    );

    const completedCount = path.resources.filter(r => r.completed).length;
    const totalCount = path.resources.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const currentResource = path.resources[currentResourceIndex];

    return (
        <div className="modern-path-viewer">
            
            {isPreviewMode && (
                <div className="preview-banner">
                    📋 PREVIEW MODE - Progress tracking disabled
                </div>
            )}

            <div className="top-nav-bar">
                <button 
                    className="back-button" 
                    onClick={() => isPreviewMode ? navigate("/Dashboard/CreatorDashboard") : navigate("/Dashboard/LearnerDashboard")}
                >
                    ← Back to Dashboard
                </button>
                <div className="course-title-nav">
                    <h2>{path.title}</h2>
                </div>
                {!isPreviewMode && (
                    <div className="progress-badge">
                        {progress}% Complete
                    </div>
                )}
            </div>

            <div className="viewer-main-content">
                
                <div className="content-viewer-section">
                    
                    <div className="resource-header">
                        <div className="resource-title-info">
                            <span className="resource-number">
                                Resource {currentResourceIndex + 1} of {totalCount}
                            </span>
                            <h1>{currentResource.title}</h1>
                            <div className="resource-meta-info">
                                <span className="type-badge">{currentResource.type}</span>
                                <span className="time-badge">⏱ {currentResource.estimated_time || 0} mins</span>
                            </div>
                        </div>
                    </div>

                    <div className="content-display">
                        {currentResource.type === 'video' && (
                            <div className="video-container">
                                <iframe
                                    src={getEmbedUrl(currentResource.url)}
                                    title={currentResource.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                        
                        {currentResource.type === 'article' && (
                            <div className="article-container">
                                <div className="article-content">
                                    <p className="article-description">{currentResource.description}</p>
                                    <a 
                                        href={currentResource.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="open-article-btn"
                                    >
                                        📄 Open Article in New Tab →
                                    </a>
                                </div>
                            </div>
                        )}
                        
                        {currentResource.type === 'quiz' && (
                            <div className="quiz-container">
                                <div className="quiz-info">
                                    <h3>📝 Quiz Time!</h3>
                                    <p>{currentResource.description}</p>
                                    <button 
                                        className="start-quiz-btn"
                                        onClick={() => navigate(`/quiz/${currentResource.id}${isPreviewMode ? '?preview=true' : ''}`)}
                                    >
                                        {isPreviewMode ? 'View Quiz (Preview)' : 'Start Quiz →'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="content-controls">
                        <button 
                            className="nav-btn prev-btn"
                            onClick={() => setCurrentResourceIndex(Math.max(0, currentResourceIndex - 1))}
                            disabled={currentResourceIndex === 0}
                        >
                            ← Previous
                        </button>
                        
                        {!isPreviewMode && !currentResource.completed && (
                            <button 
                                className="complete-resource-btn"
                                onClick={() => completeResource(currentResource.id)}
                            >
                                ✓ Mark as Complete
                            </button>
                        )}
                        
                        {!isPreviewMode && currentResource.completed && (
                            <span className="completed-indicator">✓ Completed</span>
                        )}
                        
                        <button 
                            className="nav-btn next-btn"
                            onClick={() => setCurrentResourceIndex(Math.min(totalCount - 1, currentResourceIndex + 1))}
                            disabled={currentResourceIndex === totalCount - 1}
                        >
                            Next →
                        </button>
                    </div>
                </div>

                <div className="curriculum-sidebar">
                    
                    {!isPreviewMode && (
                        <div className="progress-overview">
                            <h3>Your Progress</h3>
                            <div className="progress-bar-modern">
                                <div 
                                    className="progress-fill-modern" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="progress-stats">
                                {completedCount} of {totalCount} completed
                            </p>
                        </div>
                    )}

                    <div className="curriculum-list">
                        <h3>Course Content</h3>
                        <div className="resources-scroll">
                            {path.resources.map((resource, index) => (
                                <div 
                                    key={resource.id}
                                    className={`curriculum-item ${index === currentResourceIndex ? 'active' : ''} ${resource.completed && !isPreviewMode ? 'completed' : ''}`}
                                    onClick={() => setCurrentResourceIndex(index)}
                                >
                                    <div className="curriculum-item-left">
                                        <div className="item-number">{index + 1}</div>
                                        <div className="item-info">
                                            <h4>{resource.title}</h4>
                                            <span className="item-type">{resource.type} • {resource.estimated_time}m</span>
                                        </div>
                                    </div>
                                    <div className="curriculum-item-right">
                                        {!isPreviewMode && resource.completed && (
                                            <span className="check-icon">✓</span>
                                        )}
                                        {index === currentResourceIndex && (
                                            <span className="playing-icon">▶</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PathViewer;