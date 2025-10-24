import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import "../../styles/CreatePathPage.css"; // Reuse the same styles

// QuizBuilderModal (same as CreatePath)
function QuizBuilderModal({ resource, onSave, onCancel }) {
    const [questions, setQuestions] = useState(resource.questions || []);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newOptions, setNewOptions] = useState(['', '', '']);
    const [correctOptionIndex, setCorrectOptionIndex] = useState(-1);

    const handleAddQuestion = () => {
        if (!newQuestionText.trim() || correctOptionIndex === -1) {
            alert("Please enter a question and select the correct answer.");
            return;
        }

        const questionToAdd = {
            text: newQuestionText.trim(),
            options: newOptions.filter(o => o.trim()).map((text, index) => ({
                text: text.trim(),
                isCorrect: index === correctOptionIndex
            }))
        };
        
        setQuestions([...questions, questionToAdd]);
        setNewQuestionText('');
        setNewOptions(['', '', '']);
        setCorrectOptionIndex(-1);
    };

    const handleSave = () => { 
        if (questions.length === 0) {
            alert("Please add at least one question before saving.");
            return;
        }
        onSave(questions); 
    };

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...newOptions];
        updatedOptions[index] = value;
        setNewOptions(updatedOptions);
    };

    return ( 
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Quiz Builder: {resource.title}</h2>
                
                <div className="quiz-questions-display">
                    {questions.length === 0 ? (
                        <p>No questions added yet.</p>
                    ) : (
                        questions.map((q, qIndex) => (
                            <div key={qIndex} className="quiz-question-item">
                                <strong>Q{qIndex + 1}: {q.text}</strong>
                                <ul>
                                    {q.options.map((o, oIndex) => (
                                        <li key={oIndex} style={{ color: o.isCorrect ? 'green' : 'inherit' }}>
                                            {o.text} {o.isCorrect && ' ✓ (Correct)'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </div>

                <div className="quiz-add-form">
                    <h4>Add New Question</h4>
                    <input 
                        type="text" 
                        placeholder="Enter Question Text" 
                        value={newQuestionText} 
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="form-input-modal"
                    />
                    
                    {newOptions.map((option, index) => (
                        <div key={index} className="option-row">
                            <input 
                                type="radio" 
                                name="correctOption" 
                                checked={correctOptionIndex === index}
                                onChange={() => setCorrectOptionIndex(index)} 
                            />
                            <input 
                                type="text" 
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                className="form-input-modal"
                            />
                        </div>
                    ))}
                    
                    <button type="button" onClick={handleAddQuestion} className="btn-add-question">
                        Add Question to Quiz
                    </button>
                </div>
                
                <div className="modal-actions">
                    <button onClick={handleSave} className="btn-save">Save Quiz</button>
                    <button onClick={onCancel} className="btn-cancel">Cancel</button>
                </div>
            </div>
        </div> 
    );
}

// EditPathPage Component
const EditPathPage = () => {
    const navigate = useNavigate();
    const { pathId } = useParams();
    
    const [loading, setLoading] = useState(true);
    const [pathTitle, setPathTitle] = useState("");
    const [resources, setResources] = useState([]);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [currentImageUrl, setCurrentImageUrl] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingResourceIndex, setEditingResourceIndex] = useState(null);
    const [newResource, setNewResource] = useState({ 
        title: "", 
        type: "video", 
        url: "", 
        description: "", 
        estimatedTime: "" 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch existing path data
    useEffect(() => {
        const fetchPathData = async () => {
            try {
                setLoading(true);
                const res = await API.get(`/paths/${pathId}`);
                const pathData = res.data;
                
                setPathTitle(pathData.title);
                setCurrentImageUrl(pathData.image_url);
                setImagePreview(pathData.image_url);
                setIsPublic(pathData.is_public);
                
                // Format resources for editing
                const formattedResources = pathData.resources.map((res, index) => ({
                    ...res,
                    tempId: `existing-${res.id}`,
                    estimatedTime: res.estimated_time,
                    order: index
                }));
                
                setResources(formattedResources);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching path:", err);
                alert("Failed to load path data");
                navigate('/dashboard/CreatorDashboard');
            }
        };

        fetchPathData();
    }, [pathId, navigate]);

    const handleResourceChange = (e) => {
        let value = e.target.value;
        const name = e.target.name;

        if (name === 'estimatedTime') {
            const parsedValue = parseInt(value, 10);
            value = isNaN(parsedValue) ? 0 : parsedValue;
            if (e.target.value === "") value = "";
        }

        setNewResource({ ...newResource, [name]: value });
    };

    const addResource = () => {
        if (!newResource.title) { alert("Title required!"); return; } 
        if (newResource.type !== 'quiz' && !newResource.url) { alert("URL required!"); return; } 
        
        const finalEstimatedTime = newResource.estimatedTime === "" 
            ? 0 
            : parseInt(newResource.estimatedTime, 10) || 0;

        const resourceToAdd = { 
            ...newResource, 
            estimatedTime: finalEstimatedTime, 
            tempId: `temp-${Date.now()}-${resources.length}`, 
            order: resources.length, 
            questions: newResource.type === 'quiz' ? [] : undefined,
            isNew: true // Mark as new resource
        }; 
        
        setResources([...resources, resourceToAdd]); 
        setNewResource({ title: "", type: "video", url: "", description: "", estimatedTime: "" }); 
    };

    const removeResource = (indexToRemove) => {
        const newResources = resources.filter((_, index) => index !== indexToRemove);
        const reorderedResources = newResources.map((res, index) => ({ ...res, order: index }));
        setResources(reorderedResources);
    };

    const openQuizEditor = (index) => { 
        setIsModalOpen(true); 
        setEditingResourceIndex(index); 
    };

    const handleSaveQuiz = (questionsData) => { 
        const updatedResources = [...resources]; 
        updatedResources[editingResourceIndex].questions = questionsData; 
        setResources(updatedResources); 
        setIsModalOpen(false); 
        setEditingResourceIndex(null); 
    };

    const handleCancelQuiz = () => { 
        setIsModalOpen(false); 
        setEditingResourceIndex(null); 
    };

    const handleOnDragEnd = (result) => { 
        if (!result.destination) return; 
        const items = Array.from(resources); 
        const [reorderedItem] = items.splice(result.source.index, 1); 
        items.splice(result.destination.index, 0, reorderedItem); 
        const updatedItems = items.map((item, index) => ({ ...item, order: index })); 
        setResources(updatedItems); 
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
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

    const updatePath = async () => {
        if (!pathTitle || resources.length === 0) { 
            alert("Title and at least one resource required!"); 
            return; 
        }

        setIsSubmitting(true);
        try { 
            const formData = new FormData(); 
            formData.append("title", pathTitle); 

            const resToSend = resources.map(({ tempId, estimatedTime, isNew, ...rest }) => {
                let cleanedTime = parseInt(estimatedTime, 10);
                if (isNaN(cleanedTime)) cleanedTime = 0;
                
                return {
                    ...rest,
                    estimated_time: cleanedTime
                };
            });

            formData.append("resources", JSON.stringify(resToSend)); 
            
            // Only append image if a new one was selected
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
            alert(err.response?.data?.message || "Error updating path"); 
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this path? This action cannot be undone.")) {
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

    if (loading) {
        return (
            <div className="create-path-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading path data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="create-path-container">
            <div className="create-path-header">
                <button onClick={() => navigate('/dashboard/CreatorDashboard')} className="btn-back">
                    ← Back to Dashboard
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <h1>Edit Learning Path</h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handleToggleVisibility} className="btn-toggle-visibility">
                            {isPublic ? '🔒 Make Private' : '🌐 Make Public'}
                        </button>
                        <button onClick={handlePreview} className="btn-preview-edit">
                            👁️ Preview
                        </button>
                    </div>
                </div>
            </div>

            <div className="create-path-form">
                {/* Path Details Section */}
                <div className="form-section">
                    <h2>Path Details</h2>
                    <div className="form-group">
                        <label>Path Title *</label>
                        <input 
                            type="text" 
                            placeholder="e.g., Complete Java Bootcamp" 
                            value={pathTitle} 
                            onChange={(e) => setPathTitle(e.target.value)} 
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Path Cover Image</label>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Upload a new image to replace the current one
                        </p>
                        <div className="image-upload-area">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageChange}
                                id="image-upload"
                                className="file-input"
                            />
                            <label htmlFor="image-upload" className="upload-label">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="image-preview" />
                                ) : (
                                    <div className="upload-placeholder">
                                        <span className="upload-icon">📷</span>
                                        <span>Click to upload new image</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Add Resources Section */}
                <div className="form-section">
                    <h2>Add More Resources</h2>
                    <div className="resource-form-grid">
                        <div className="form-group">
                            <label>Resource Title *</label>
                            <input 
                                type="text" 
                                placeholder="e.g., Introduction to Java" 
                                name="title" 
                                value={newResource.title} 
                                onChange={handleResourceChange} 
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Type *</label>
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
                        </div>

                        {newResource.type !== 'quiz' && (
                            <div className="form-group full-width">
                                <label>Resource URL *</label>
                                <input 
                                    type="text" 
                                    placeholder="https://..." 
                                    name="url" 
                                    value={newResource.url} 
                                    onChange={handleResourceChange} 
                                    className="form-input"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Description</label>
                            <input 
                                type="text" 
                                placeholder="Brief description" 
                                name="description" 
                                value={newResource.description} 
                                onChange={handleResourceChange} 
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>Estimated Time (mins)</label>
                            <input 
                                type="number" 
                                placeholder="e.g., 15" 
                                name="estimatedTime" 
                                value={newResource.estimatedTime} 
                                onChange={handleResourceChange} 
                                className="form-input"
                            />
                        </div>
                    </div>

                    <button onClick={addResource} className="btn-add-resource">
                        + Add Resource
                    </button>
                </div>

                {/* Resources List Section */}
                {resources.length > 0 && (
                    <div className="form-section">
                        <h2>Path Resources ({resources.length})</h2>
                        <p className="section-hint">Drag to reorder</p>
                        <DragDropContext onDragEnd={handleOnDragEnd}>
                            <Droppable droppableId="resources">
                                {(provided) => (
                                    <ul className="resource-list" {...provided.droppableProps} ref={provided.innerRef}>
                                        {resources.map((res, index) => (
                                            <Draggable key={res.tempId} draggableId={res.tempId} index={index}>
                                                {(provided, snapshot) => (
                                                    <li 
                                                        className={`resource-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                                        ref={provided.innerRef} 
                                                        {...provided.draggableProps} 
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <div className="resource-drag-handle">⋮⋮</div>
                                                        <div className="resource-details">
                                                            <div className="resource-title">
                                                                <span className="resource-number">{index + 1}.</span>
                                                                <strong>{res.title}</strong>
                                                                <span className="resource-type-badge">{res.type}</span>
                                                            </div>
                                                            <div className="resource-meta">
                                                                {res.description && <span>{res.description}</span>}
                                                                <span>⏱️ {res.estimatedTime} mins</span>
                                                            </div>
                                                        </div>
                                                        <div className="resource-actions">
                                                            {res.type === 'quiz' && (
                                                                <button 
                                                                    onClick={() => openQuizEditor(index)} 
                                                                    className="btn-edit-quiz"
                                                                >
                                                                    Edit Quiz ({res.questions?.length || 0})
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => removeResource(index)} 
                                                                className="btn-remove"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </li>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </ul>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="form-actions">
                    <button 
                        onClick={handleDelete} 
                        className="btn-delete-path"
                        disabled={isSubmitting}
                    >
                        🗑️ Delete Path
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button 
                        onClick={() => navigate('/dashboard/CreatorDashboard')} 
                        className="btn-cancel-form"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={updatePath} 
                        className="btn-submit-path"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Updating...' : '✓ Update Learning Path'}
                    </button>
                </div>
            </div>

            {/* Quiz Modal */}
            {isModalOpen && (
                <QuizBuilderModal
                    resource={resources[editingResourceIndex]}
                    onSave={handleSaveQuiz}
                    onCancel={handleCancelQuiz}
                />
            )}
        </div>
    );
};

export default EditPathPage;