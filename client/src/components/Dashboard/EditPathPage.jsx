import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import API from "../../api";
import "../../styles/EditPathPage.css";

const EditPathPage = () => {
    const navigate = useNavigate();
    const { pathId } = useParams();
    
    const [loading, setLoading] = useState(true);
    const [pathTitle, setPathTitle] = useState("");
    const [resources, setResources] = useState([]);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    
    const [newResource, setNewResource] = useState({ 
        title: "", 
        type: "video", 
        url: "", 
        description: "", 
        estimatedTime: "0" 
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPathData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get(`/creator/paths/${pathId}`);
            const pathData = res.data;
            
            console.log("Fetched path data:", pathData);
            
            setPathTitle(pathData.title);
            setIsPublic(pathData.is_public);
            
            let imageUrl = pathData.image_url;
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `http://localhost:5000${imageUrl}`;
            }
            setImagePreview(imageUrl);
            
            const formattedResources = (pathData.resources || []).map((res, index) => ({
                id: res.id,
                title: res.title,
                type: res.type,
                url: res.url || '',
                description: res.description || '',
                estimatedTime: res.estimated_time || 0,
                tempId: `existing-${res.id || index}`,
                order: index
            }));
            
            setResources(formattedResources);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching path:", err);
            alert("Failed to load path data");
            navigate('/dashboard/CreatorDashboard');
        }
    }, [pathId, navigate]);

    useEffect(() => {
        fetchPathData();
    }, [fetchPathData]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleResourceChange = (e) => {
        const { name, value } = e.target;
        setNewResource({ ...newResource, [name]: value });
    };

    const addResource = () => {
        if (!newResource.title.trim()) {
            alert("Resource title is required!");
            return;
        }
        
        if (newResource.type !== 'quiz' && !newResource.url.trim()) {
            alert("Resource URL is required!");
            return;
        }

        const resourceToAdd = { 
            title: newResource.title,
            type: newResource.type,
            url: newResource.url,
            description: newResource.description,
            estimatedTime: parseInt(newResource.estimatedTime) || 0,
            tempId: `new-${Date.now()}`,
            order: resources.length,
            isNew: true
        };
        
        setResources([...resources, resourceToAdd]);
        
        setNewResource({ 
            title: "", 
            type: "video", 
            url: "", 
            description: "", 
            estimatedTime: "0" 
        });
    };

    const removeResource = (index) => {
        const newResources = resources.filter((_, i) => i !== index);
        const reordered = newResources.map((res, i) => ({ ...res, order: i }));
        setResources(reordered);
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(resources);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        const reorderedItems = items.map((item, index) => ({
            ...item,
            order: index
        }));
        
        setResources(reorderedItems);
        console.log("Resources reordered");
    };

    const handleToggleVisibility = async () => {
        try {
            const newVisibility = !isPublic;
            await API.put(`/creator/paths/${pathId}/visibility`, { is_public: newVisibility });
            setIsPublic(newVisibility);
            alert(`Path is now ${newVisibility ? 'Public' : 'Private'}`);
        } catch (err) {
            console.error("Visibility toggle error:", err);
            alert("Failed to update visibility");
        }
    };

    const handlePreview = () => {
        navigate(`/path/view/${pathId}`, { state: { preview: true } });
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this path?")) {
            return;
        }

        try {
            await API.delete(`/creator/learning-paths/${pathId}`);
            alert("Path deleted successfully!");
            navigate('/dashboard/CreatorDashboard');
        } catch (err) {
            console.error("Error deleting path:", err);
            alert("Failed to delete path");
        }
    };

    const updatePath = async () => {
        if (!pathTitle.trim()) {
            alert("Path title is required!");
            return;
        }

        if (resources.length === 0) {
            alert("Please add at least one resource!");
            return;
        }

        console.log("=== UPDATING PATH ===");
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", pathTitle);

            const resToSend = resources.map((res, index) => ({
                title: res.title,
                type: res.type,
                url: res.url || null,
                description: res.description || "",
                estimated_time: parseInt(res.estimatedTime) || 0,
                order: index
            }));

            formData.append("resources", JSON.stringify(resToSend));

            if (image) {
                formData.append("image", image);
            }

            await API.put(`/creator/learning-paths/${pathId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            alert("Path updated successfully!");
            navigate('/dashboard/CreatorDashboard');
        } catch (err) {
            console.error("Error updating path:", err);
            alert(err.response?.data?.message || "Failed to update path");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="edit-path-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading path data...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ 
        height: '100vh', 
        overflowY: 'scroll', 
        overflowX: 'hidden',
        backgroundColor: '#f8f9fa'
    }}>
        <div className="edit-path-page">
            <div className="edit-header">
                <button onClick={() => navigate('/dashboard/CreatorDashboard')} className="btn-back">
                    ← Back to Dashboard
                </button>
                <div className="header-actions">
                    <h1>Edit Learning Path</h1>
                    <div className="header-buttons">
                        <button onClick={handleToggleVisibility} className="btn-toggle-vis">
                            {isPublic ? '🔒 Make Private' : '🌐 Make Public'}
                        </button>
                        <button onClick={handlePreview} className="btn-preview-header">
                            👁️ Preview
                        </button>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h2>Path Details</h2>
                <div className="form-group">
                    <label>Path Title *</label>
                    <input 
                        type="text" 
                        value={pathTitle} 
                        onChange={(e) => setPathTitle(e.target.value)} 
                        className="form-input"
                        placeholder="Enter path title"
                    />
                </div>

                <div className="form-group">
                    <label>Path Cover Image</label>
                    <div className="image-upload">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            id="image-upload"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="image-upload" className="image-label">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="image-preview" />
                            ) : (
                                <div className="image-placeholder">
                                    <span>📷</span>
                                    <span>Click to upload image</span>
                                </div>
                            )}
                        </label>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h2>Add New Resource</h2>
                <div className="resource-form">
                    <input 
                        type="text" 
                        name="title"
                        value={newResource.title} 
                        onChange={handleResourceChange}
                        placeholder="Resource Title *"
                        className="form-input"
                    />
                    
                    <select 
                        name="type"
                        value={newResource.type} 
                        onChange={handleResourceChange}
                        className="form-input"
                    >
                        <option value="video">📹 Video</option>
                        <option value="article">📄 Article</option>
                        <option value="quiz">❓ Quiz</option>
                    </select>

                    {newResource.type !== 'quiz' && (
                        <input 
                            type="text" 
                            name="url"
                            value={newResource.url} 
                            onChange={handleResourceChange}
                            placeholder="Resource URL *"
                            className="form-input"
                        />
                    )}

                    <input 
                        type="text" 
                        name="description"
                        value={newResource.description} 
                        onChange={handleResourceChange}
                        placeholder="Description"
                        className="form-input"
                    />

                    <input 
                        type="number" 
                        name="estimatedTime"
                        value={newResource.estimatedTime} 
                        onChange={handleResourceChange}
                        placeholder="Time (mins)"
                        className="form-input"
                        min="0"
                    />

                    <button onClick={addResource} className="btn-add-resource">
                        + Add Resource
                    </button>
                </div>
            </div>

            {resources.length > 0 && (
                <div className="form-section">
                    <h2>Resources ({resources.length})</h2>
                    <p className="drag-hint">💡 Drag to reorder resources</p>
                    
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="resources">
                            {(provided) => (
                                <div 
                                    className="resources-list"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {resources.map((res, index) => (
                                        <Draggable 
                                            key={res.tempId} 
                                            draggableId={res.tempId} 
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div 
                                                    className={`resource-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    <div className="resource-info">
                                                        <div className="drag-handle">⋮⋮</div>
                                                        <div className="resource-number">{index + 1}</div>
                                                        <div className="resource-details">
                                                            <h4>{res.title}</h4>
                                                            <div className="resource-meta">
                                                                <span className="resource-type">{res.type}</span>
                                                                <span className="resource-time">⏱️ {res.estimatedTime} mins</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeResource(index)}
                                                        className="btn-remove"
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}

            <div className="form-actions">
                <button onClick={handleDelete} className="btn-delete" disabled={isSubmitting}>
                    🗑️ Delete Path
                </button>
                <div style={{ flex: 1 }}></div>
                <button 
                    onClick={() => navigate('/dashboard/CreatorDashboard')} 
                    className="btn-cancel"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button 
                    onClick={updatePath} 
                    className="btn-update"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Updating...' : '✓ Update Path'}
                </button>
            </div>
        </div>
        </div>
    );
};

export default EditPathPage;