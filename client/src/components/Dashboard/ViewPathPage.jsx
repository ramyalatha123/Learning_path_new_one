import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api";
import "../../styles/ViewPathPage.css";

const ViewPathPage = () => {
    const navigate = useNavigate();
    const { pathId } = useParams();
    const [path, setPath] = useState(null);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPathData();
    }, [pathId]);

    const fetchPathData = async () => {
        try {
            setLoading(true);
            // Get path basic info from mypaths
            const allPaths = await API.get('/paths/mypaths');
            const foundPath = allPaths.data.find(p => p.id === parseInt(pathId));
            
            if (foundPath) {
                // Fix image URL
                foundPath.image_url = foundPath.image_url && !foundPath.image_url.startsWith('http')
                    ? `http://localhost:5000${foundPath.image_url}`
                    : foundPath.image_url;
                setPath(foundPath);
            }
            
            // For now, show empty resources - you can add endpoint later
            setResources([]);
            setLoading(false);
        } catch (err) {
            console.error("Error:", err);
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/dashboard/CreatorDashboard');
    };

    const handleToggleVisibility = async () => {
        try {
            const newVisibility = !path.is_public;
            await API.put(`/creator/paths/${pathId}/visibility`, { is_public: newVisibility });
            setPath({ ...path, is_public: newVisibility });
        } catch (err) {
            alert("Failed to update visibility");
        }
    };

    const handlePreview = () => {
        navigate(`/path/view/${pathId}`, { state: { preview: true } });
    };

    if (loading) {
        return (
            <div className="view-path-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading path...</p>
                </div>
            </div>
        );
    }

    if (!path) {
        return (
            <div className="view-path-page">
                <div className="error-container">
                    <h2>Path not found</h2>
                    <button onClick={handleBack}>Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="view-path-page">
            <div className="page-header">
                <button className="btn-back" onClick={handleBack}>
                    ← Back to Dashboard
                </button>
            </div>

            <div className="path-details-card">
                <div className="path-hero">
                    <img 
                        src={path.image_url || 'https://via.placeholder.com/800x300?text=No+Image'} 
                        alt={path.title}
                        className="hero-image"
                    />
                    <div className={`status-badge ${path.is_public ? 'public' : 'private'}`}>
                        {path.is_public ? '🌐 Public' : '🔒 Private'}
                    </div>
                </div>

                <div className="path-info">
                    <h1>{path.title}</h1>
                    
                    <div className="path-stats">
                        <div className="stat">
                            <span className="stat-label">Resources</span>
                            <span className="stat-value">{path.resource_count || 0}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Duration</span>
                            <span className="stat-value">{path.total_time || 0} mins</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Status</span>
                            <span className="stat-value">{path.is_public ? 'Published' : 'Draft'}</span>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="btn btn-primary" onClick={handlePreview}>
                            👁️ Preview Path
                        </button>
                        <button className="btn btn-secondary" onClick={handleToggleVisibility}>
                            {path.is_public ? '🔒 Make Private' : '🌐 Make Public'}
                        </button>
                        <button className="btn btn-edit" onClick={() => navigate(`/dashboard/creator/edit-path/${pathId}`)}>
                            ✏️ Edit Path
                        </button>
                    </div>
                </div>
            </div>

            <div className="resources-section">
                <h2>Path Resources</h2>
                {resources.length === 0 ? (
                    <div className="empty-resources">
                        <p>No resources yet. Edit the path to add resources.</p>
                        <button 
                            className="btn btn-primary"
                            onClick={() => navigate(`/dashboard/creator/edit-path/${pathId}`)}
                        >
                            Add Resources
                        </button>
                    </div>
                ) : (
                    <div className="resources-list">
                        {resources.map((resource, index) => (
                            <div key={resource.id} className="resource-item">
                                <span className="resource-number">{index + 1}</span>
                                <div className="resource-info">
                                    <h4>{resource.title}</h4>
                                    <p>{resource.type} • {resource.estimated_time} mins</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewPathPage;