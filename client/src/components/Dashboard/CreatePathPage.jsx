import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import "../../styles/CreatePathPage.css";

// QuizBuilderModal Component
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

// Main CreatePathPage Component
const CreatePathPage = () => {
    const navigate = useNavigate();
    const [pathTitle, setPathTitle] = useState("");
    const [resources, setResources] = useState([]);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
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
            questions: newResource.type === 'quiz' ? [] : undefined 
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

    const submitPath = async () => {
        if (!pathTitle || !image || resources.length === 0) { 
            alert("Title, image, & at least one resource required!"); 
            return; 
        }

        setIsSubmitting(true);
        try { 
            const formData = new FormData(); 
            formData.append("title", pathTitle); 

            const resToSend = resources.map(({ tempId, estimatedTime, ...rest }) => {
                let cleanedTime = parseInt(estimatedTime, 10);
                if (isNaN(cleanedTime)) cleanedTime = 0;
                
                return {
                    ...rest,
                    estimated_time: cleanedTime
                };
            });

            formData.append("resources", JSON.stringify(resToSend)); 
            formData.append("image", image); 

            await API.post("/creator/learning-paths", formData, { 
                headers: { "Content-Type": "multipart/form-data" } 
            }); 
            
            alert("Path created successfully!");
            navigate('/dashboard/CreatorDashboard');

        } catch (err) { 
            console.error("Error creating path:", err);
            alert(err.response?.data?.message || "Error creating path"); 
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-path-container">
            <div className="create-path-header">
                <button onClick={() => navigate('/dashboard/CreatorDashboard')} className="btn-back">
                    ← Back to Dashboard
                </button>
                <h1>Create New Learning Path</h1>
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
                        <label>Path Cover Image *</label>
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
                                        <span>Click to upload image</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Add Resources Section */}
                <div className="form-section">
                    <h2>Add Resources</h2>
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

                {/* Submit Section */}
                <div className="form-actions">
                    <button 
                        onClick={() => navigate('/dashboard/CreatorDashboard')} 
                        className="btn-cancel-form"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={submitPath} 
                        className="btn-submit-path"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : '✓ Create Learning Path'}
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

export default CreatePathPage;