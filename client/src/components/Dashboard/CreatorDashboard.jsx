import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import "../../styles/CreatorDashboard.css";

const CreatorDashboard = () => {
    const navigate = useNavigate();
    const [myPaths, setMyPaths] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyPaths();
    }, []);

    const fetchMyPaths = async () => {
        try {
            setLoading(true);
            const res = await API.get('/paths/mypaths');
            
            // Fix image URLs if they're relative paths
            const pathsWithFullUrls = res.data.map(path => ({
                ...path,
                image_url: path.image_url && !path.image_url.startsWith('http') 
                    ? `http://localhost:5000${path.image_url}` 
                    : path.image_url
            }));
            
            console.log("Loaded paths:", pathsWithFullUrls);
            setMyPaths(pathsWithFullUrls);
        } catch (err) {
            console.error("Error fetching paths:", err);
            alert(err.response?.data?.message || 'Failed to load your paths.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        navigate('/dashboard/creator/create-path');
    };

    const handleEditPath = (pathId) => {
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
        <div className="creator-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>My Learning Paths</h1>
                    <p className="subtitle">Create and manage your courses</p>
                </div>
                <button onClick={handleCreateNew} className="btn-create">
                    <span className="plus-icon">+</span> Create New Path
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your paths...</p>
                </div>
            ) : myPaths.length === 0 ? (
                /* Empty State */
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h2>No paths created yet</h2>
                    <p>Start building your first learning path to share knowledge with learners!</p>
                    <button onClick={handleCreateNew} className="btn-create">
                        Create Your First Path
                    </button>
                </div>
            ) : (
                /* Paths Grid */
                <div className="paths-grid">
                    {myPaths.map((path) => (
                        <div 
                            key={path.id} 
                            className="path-card"
                            onClick={() => handleEditPath(path.id)}
                        >
                            <div className="card-image">
                                <img 
                                    src={path.image_url || 'https://via.placeholder.com/400x200?text=No+Image'} 
                                    alt={path.title}
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                                    }}
                                />
                                <div className={`badge ${path.is_public ? 'public' : 'private'}`}>
                                    {path.is_public ? '🌐 Public' : '🔒 Private'}
                                </div>
                            </div>
                            
                            <div className="card-content">
                                <h3>{path.title}</h3>
                                
                                <div className="card-stats">
                                    <span>📝 {path.resource_count || 0} Resources</span>
                                    <span>⏱️ {path.total_time || 0} mins</span>
                                </div>

                                <div className="card-actions">
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