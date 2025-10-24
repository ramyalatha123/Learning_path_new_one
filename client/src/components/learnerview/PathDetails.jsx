import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";
import '../../styles/PathDetails.css'; 

const PathDetails = () => {
    const { pathId } = useParams();
    const navigate = useNavigate();
    const [path, setPath] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pathError, setPathError] = useState(null);
    
    // State to track which resource is expanded (accordion)
    const [expandedResource, setExpandedResource] = useState(null);

    // Fetch the path details using the fixed universal API route
    const fetchPathDetails = async () => {
        try {
            setLoading(true);
            const res = await API.get(`/paths/view/${pathId}`); 
            
            setPath({
                ...res.data.path,
                resources: res.data.resources
            });

            setLoading(false);
        } catch (err) {
            setPathError("Failed to load course details. Path not found or access denied.");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pathId) {
            fetchPathDetails();
        }
    }, [pathId]);

    // Toggle accordion for a specific resource
    const toggleResourceExpand = (index) => {
        setExpandedResource(expandedResource === index ? null : index);
    };

    // Handle the final registration after user views details
    const handleRegister = async () => {
        try {
            await API.post("/learner/register-path", { path_id: pathId });
            alert(`Successfully registered for ${path.title}! You can start learning now.`);
            navigate(`/path/view/${pathId}`); 
        } catch (err) {
            alert(err.response?.data?.message || "Failed to register for the path. Please try again.");
        }
    };

    if (loading) return <div className="details-loading">Loading Course Details...</div>;
    if (pathError) return <div className="details-error">{pathError}</div>;
    if (!path) return <div className="details-error">Course not available.</div>;

    // Calculate total estimated time
    const totalTime = path.resources?.reduce((sum, res) => sum + (parseInt(res.estimated_time) || 0), 0);
    const totalResources = path.resources?.length || 0;

    return (
        <div className="path-details-container">
            <div className="details-header">
                <button onClick={() => navigate(-1)} className="btn btn-secondary back-btn">
                    &larr; Back to Dashboard
                </button>
                <h1>{path.title}</h1>
                <p className="description-text">{path.description || path.short_description}</p>
                
                <div className="key-metrics">
                    <span>⏱️ **Total Time:** ~{totalTime} minutes</span>
                    <span>📚 **Modules:** {totalResources} resources</span>
                    <span>📜 **Certification:** Available upon 100% completion</span>
                </div>
                
                <button onClick={handleRegister} className="btn btn-submit register-now-btn">
                    Excell your skills!!
                </button>
            </div>

            <div className="details-content">
                <h2>Course Curriculum Outline:</h2>
                
                {/* Enhanced Accordion-style Resources */}
                <div className="resources-accordion">
                    {path.resources?.map((res, index) => (
                        <div key={index} className="accordion-item">
                            {/* Clickable Header */}
                            <div 
                                className={`accordion-header ${expandedResource === index ? 'expanded' : ''}`}
                                onClick={() => toggleResourceExpand(index)}
                            >
                                <div className="accordion-header-left">
                                    <span className="resource-index">{index + 1}.</span>
                                    <span className="resource-title">{res.title}</span>
                                    <span className="resource-type-badge">{res.type}</span>
                                </div>
                                <div className="accordion-header-right">
                                    <span className="resource-time">⏱️ {res.estimated_time} mins</span>
                                    <span className={`accordion-arrow ${expandedResource === index ? 'rotate' : ''}`}>
                                        ▼
                                    </span>
                                </div>
                            </div>
                            
                            {/* Expandable Content */}
                            {expandedResource === index && (
                                <div className="accordion-content">
                                    <div className="accordion-content-inner">
                                        <h4>📝 What You'll Learn:</h4>
                                        <p>{res.description || "No description provided for this resource."}</p>
                                        
                                        {/* Info box - resource will be available after registration */}
                                        <div className="resource-locked-info">
                                            <p className="locked-message">
                                                🔒 <strong>This {res.type} will be available after registration.</strong><br/>
                                                Register now to access all course materials and start your learning journey!
                                            </p>
                                        </div>
                                        
                                        <div className="resource-meta">
                                            <span className="meta-item">📚 Type: <strong>{res.type}</strong></span>
                                            <span className="meta-item">⏳ Duration: <strong>{res.estimated_time} minutes</strong></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="details-footer">
                <button onClick={handleRegister} className="btn btn-submit register-bottom-btn">
                    Register Now & Start Learning
                </button>
            </div>
        </div>
    );
};

export default PathDetails;