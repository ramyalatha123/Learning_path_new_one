import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import "../../styles/CreatorDashboard.css";

const CreatorDashboard = () => {
    const navigate = useNavigate();
    const [myPaths, setMyPaths] = useState([]);
    const [loadingPaths, setLoadingPaths] = useState(true);
    const [error, setError] = useState('');

    // Fetch creator's paths
    const fetchMyPaths = async () => {
        try {
            setLoadingPaths(true);
            setError('');
            const res = await API.get('/paths/mypaths');
            
            // Fix image URLs if they're relative paths
            const pathsWithFullUrls = res.data.map(path => ({
                ...path,
                image_url: path.image_url && !path.image_url.startsWith('http') 
                    ? `http://localhost:5000${path.image_url}` 
                    : path.image_url
            }));
            
            console.log("Loaded paths:", pathsWithFullUrls); // Debug log
            setMyPaths(pathsWithFullUrls);
            setLoadingPaths(false);
        } catch (err) {
            console.error("Error fetching paths:", err);
            setError(err.response?.data?.message || 'Failed to load your paths.');
            setLoadingPaths(false);
        }
    };
    useEffect(() => {
    console.log("=== DEBUG INFO ===");
    console.log("My Paths Data:", myPaths);
    console.log("Loading State:", loadingPaths);
    console.log("Error State:", error);
    
    // Check each path's image URL
    myPaths.forEach((path, index) => {
        console.log(`Path ${index + 1}: "${path.title}"`);
        console.log(`  - Image URL: ${path.image_url}`);
        console.log(`  - Is Public: ${path.is_public}`);
        console.log(`  - Resource Count: ${path.resource_count}`);
    });
    
    console.log("=== END DEBUG ===");
}, [myPaths, loadingPaths, error]);

    useEffect(() => {
        fetchMyPaths();
    }, []);

    const handleCreateNew = () => {
        console.log("Create New Path clicked");
        navigate('/dashboard/creator/create-path');
    };

    const handleEditPath = (pathId) => {
        console.log("Edit path clicked:", pathId);
        navigate(`/dashboard/creator/edit-path/${pathId}`);
    };

    const handleToggleVisibility = async (pathId, currentVisibility, e) => {
        e.stopPropagation(); // Prevent card click
        try {
            const newVisibility = !currentVisibility;
            await API.put(`/creator/paths/${pathId}/visibility`, { is_public: newVisibility });
            setMyPaths(prevPaths => 
                prevPaths.map(p => p.id === pathId ? { ...p, is_public: newVisibility } : p)
            );
        } catch (err) {
            console.error("Visibility toggle error:", err);
            alert(err.response?.data?.message || 'Failed to update visibility');
        }
    };

    const handlePreview = (pathId, e) => {
        e.stopPropagation(); // Prevent card click
        navigate(`/path/view/${pathId}`, { state: { preview: true } });
    };

    return (
        <div className="creator-dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1>My Learning Paths</h1>
                    <p className="subtitle">Create and manage your courses</p>
                </div>
                <button onClick={handleCreateNew} className="btn-create-new">
                    <span className="plus-icon">+</span> Create New Path
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loadingPaths ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your paths...</p>
                </div>
            ) : myPaths.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h2>No paths created yet</h2>
                    <p>Start building your first learning path to share knowledge with learners!</p>
                    <button onClick={handleCreateNew} className="btn-empty-action">
                        Create Your First Path
                    </button>
                </div>
            ) : (
                <div className="paths-grid">
                    {myPaths.map((path) => (
                        <div 
                            key={path.id} 
                            className="path-card"
                            onClick={() => handleEditPath(path.id)}
                        >
                            <div className="path-card-image">
                                <img 
                                    src={path.image_url || 'https://via.placeholder.com/400x200?text=No+Image'} 
                                    alt={path.title}
                                    onError={(e) => {
                                        console.log("Image failed to load:", path.image_url);
                                        e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                                    }}
                                />
                                <div className={`visibility-badge ${path.is_public ? 'public' : 'private'}`}>
                                    {path.is_public ? '🌐 Public' : '🔒 Private'}
                                </div>
                            </div>
                            
                            <div className="path-card-content">
                                <h3 className="path-title">{path.title}</h3>
                                
                                <div className="path-stats">
                                    <span className="stat-item">
                                        📝 {path.resource_count || 0} Resources
                                    </span>
                                    <span className="stat-item">
                                        ⏱️ {path.total_time || 0} mins
                                    </span>
                                </div>

                                <div className="path-card-actions">
                                    <button 
                                        onClick={(e) => handleToggleVisibility(path.id, path.is_public, e)}
                                        className="btn-toggle"
                                    >
                                        Make {path.is_public ? 'Private' : 'Public'}
                                    </button>
                                    <button 
                                        onClick={(e) => handlePreview(path.id, e)}
                                        className="btn-preview"
                                    >
                                        👁️ Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CreatorDashboard;