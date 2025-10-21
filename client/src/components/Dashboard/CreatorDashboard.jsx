import React, { useState, useEffect } from "react";
import API from "../../api";
import "../../styles/CreatorDashboard.css"; // Ensure CSS is imported
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from "react-router-dom"; // Ensure navigate is imported

// --- QuizBuilderModal (Keep your working code) ---
function QuizBuilderModal({ resource, onSave, onCancel }) {
    // Initialize questions state with existing data or an empty array
    const [questions, setQuestions] = useState(resource.questions || []);

    // State for a new, temporary question being added
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newOptions, setNewOptions] = useState(['', '', '']); // Start with 3 option fields
    const [correctOptionIndex, setCorrectOptionIndex] = useState(-1); // Index of the correct answer

    // --- Handlers ---
    
    // 1. Adds the current question/options to the main 'questions' array
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

        // Reset the form fields
        setNewQuestionText('');
        setNewOptions(['', '', '']);
        setCorrectOptionIndex(-1);
    };

    // 2. Saves the collected questions and closes the modal
    const handleSave = () => { 
        if (questions.length === 0) {
             alert("Please add at least one question before saving.");
             return;
        }
        onSave(questions); 
    };

    // 3. Handles option input changes
    const handleOptionChange = (index, value) => {
        const updatedOptions = [...newOptions];
        updatedOptions[index] = value;
        setNewOptions(updatedOptions);
    };
    return ( 
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Quiz Builder: {resource.title}</h2>
                
                {/* Display Current Questions */}
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                    {questions.length === 0 ? (
                        <p>No questions added yet.</p>
                    ) : (
                        questions.map((q, qIndex) => (
                            <div key={qIndex} className="quiz-question-display">
                                <strong>Q{qIndex + 1}: {q.text}</strong>
                                <ul>
                                    {q.options.map((o, oIndex) => (
                                        <li key={oIndex} style={{ color: o.isCorrect ? 'green' : 'inherit' }}>
                                            {o.text} {o.isCorrect && ' (Correct)'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </div>

                {/* Add New Question Form */}
                <div className="quiz-add-form">
                    <h4>Add New Question</h4>
                    <input 
                        type="text" 
                        placeholder="Enter Question Text" 
                        value={newQuestionText} 
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="form-input form-section-full"
                        style={{ marginBottom: '1rem' }}
                    />
                    
                    {/* Options Input */}
                    {newOptions.map((option, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                            <input 
                                type="radio" 
                                name="correctOption" 
                                checked={correctOptionIndex === index}
                                onChange={() => setCorrectOptionIndex(index)} 
                                style={{ flexShrink: 0 }}
                            />
                            <input 
                                type="text" 
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                className="form-input"
                            />
                        </div>
                    ))}
                    
                    <button type="button" onClick={handleAddQuestion} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                        Add Question to Quiz
                    </button>
                </div>
                
                {/* Modal Actions */}
                <div className="modal-actions">
                    <button type="button" onClick={handleSave} className="btn btn-submit">Save Quiz</button>
                    <button type="button" onClick={onCancel} className="btn btn-danger">Cancel</button>
                </div>
            </div>
        </div> 
    );
}

// --- UPDATED CREATOR DASHBOARD ---
const CreateDashboard = () => {
    const navigate = useNavigate(); // Initialize navigate
    // --- State ---
    const [pathTitle, setPathTitle] = useState("");
    const [resources, setResources] = useState([]);
    const [message, setMessage] = useState(""); // General message
    const [image, setImage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingResourceIndex, setEditingResourceIndex] = useState(null);
    const [newResource, setNewResource] = useState({ title: "", type: "video", url: "", description: "", estimatedTime: "" });
    const [myPaths, setMyPaths] = useState([]);
    const [loadingPaths, setLoadingPaths] = useState(true); // Start as true
    const [pathError, setPathError] = useState(''); // Path list error
    const [pathMessage, setPathMessage] = useState(''); // Path list message

    // --- Fetch Creator's Paths ---
    const fetchMyPaths = async () => {
        try {
            console.log("[fetchMyPaths] Starting fetch..."); // Add log
            setLoadingPaths(true); setPathError(''); setPathMessage('');
            const res = await API.get('/paths/mypaths');
            console.log("[fetchMyPaths] Received paths:", res.data); // Add log
            setMyPaths(res.data);
            setLoadingPaths(false); // Make sure this is called
        } catch (err) {
            console.error("[fetchMyPaths] Error fetching creator paths:", err.response || err); // Log error
            setPathError(err.response?.data?.message || 'Failed to load your paths.');
            setLoadingPaths(false); // Make sure this is called even on error
        }
    };
    useEffect(() => { fetchMyPaths(); }, []);

    // --- Keep Existing Functions ---
    const handleResourceChange = (e) => setNewResource({ ...newResource, [e.target.name]: e.target.value });
    const addResource = () => {
         if (!newResource.title) { alert("Title required!"); return; } if (newResource.type !== 'quiz' && !newResource.url) { alert("URL required!"); return; } const resourceToAdd = { ...newResource, tempId: `temp-${Date.now()}-${resources.length}`, order: resources.length, questions: newResource.type === 'quiz' ? [] : undefined }; setResources([...resources, resourceToAdd]); setNewResource({ title: "", type: "video", url: "", description: "", estimatedTime: "" });
    };
    const removeResource = (indexToRemove) => {
         const newResources = resources.filter((_, index) => index !== indexToRemove); const reorderedResources = newResources.map((res, index) => ({ ...res, order: index })); setResources(reorderedResources);
    };
    const openQuizEditor = (index) => { setIsModalOpen(true); setEditingResourceIndex(index); };
    const handleSaveQuiz = (questionsData) => { const updatedResources = [...resources]; updatedResources[editingResourceIndex].questions = questionsData; setResources(updatedResources); setIsModalOpen(false); setEditingResourceIndex(null); };
    const handleCancelQuiz = () => { setIsModalOpen(false); setEditingResourceIndex(null); };
    const handleOnDragEnd = (result) => { if (!result.destination) return; const items = Array.from(resources); const [reorderedItem] = items.splice(result.source.index, 1); items.splice(result.destination.index, 0, reorderedItem); const updatedItems = items.map((item, index) => ({ ...item, order: index })); setResources(updatedItems); };
    const handleToggleVisibility = async (pathId, currentVisibility) => {
         const newVisibility = !currentVisibility; try { setPathMessage(''); setPathError(''); await API.put(`/creator/paths/${pathId}/visibility`, { is_public: newVisibility }); setMyPaths(prevPaths => prevPaths.map(p => p.id === pathId ? { ...p, is_public: newVisibility } : p)); setPathMessage(`Path set to ${newVisibility ? 'Public' : 'Private'}`); } catch (err) { console.error("Vis Error:", err); setPathError(err.response?.data?.message || 'Failed update'); }
    };
    const submitPath = async () => {
        if (!pathTitle || !image || resources.length === 0) { alert("Title, image, & resource required!"); return; }
        try { const formData = new FormData(); formData.append("title", pathTitle); const resToSend = resources.map(({ tempId, ...rest }) => rest); formData.append("resources", JSON.stringify(resToSend)); formData.append("image", image); await API.post("/creator/learning-paths", formData, { headers: { "Content-Type": "multipart/form-data" } }); setMessage("Path created!"); setPathTitle(""); setResources([]); setImage(null); fetchMyPaths(); } catch (err) { alert(err.response?.data?.message || "Error creating path"); }
    };

    return (
        // --- Added Wrapper for Scrolling ---
        <div className="creator-dashboard-wrapper">
            {/* --- Keep original container for centering/max-width --- */}
            <div className="creator-dashboard">

                 {/* --- Create Path Section --- */}
                 <section className="dashboard-section">
                    <h2>Create New Learning Path</h2>
                    {message && <p className="success-message">{message}</p>}
                    <input type="text" placeholder="Path Title..." value={pathTitle} onChange={(e) => setPathTitle(e.target.value)} className="form-input form-section-full" style={{ marginBottom: '1rem' }}/>
                    <h3>Upload Path Image</h3>
                    <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="form-input" style={{ marginBottom: '1rem' }}/>
                    <h3>Add Resource</h3>
                    <div className="form-section">
                        <input type="text" placeholder="Resource Title" name="title" value={newResource.title} onChange={handleResourceChange} className="form-input"/>
                        <select name="type" value={newResource.type} onChange={handleResourceChange} className="form-input"> <option value="video">Video</option> <option value="article">Article</option> <option value="quiz">Quiz</option> </select>
                        {newResource.type !== 'quiz' && ( <input type="text" placeholder="Resource URL" name="url" value={newResource.url} onChange={handleResourceChange} className="form-input form-section-full"/> )}
                        <input type="text" placeholder="Description" name="description" value={newResource.description} onChange={handleResourceChange} className="form-input"/>
                        <input type="number" placeholder="Est. Time (mins)" name="estimatedTime" value={newResource.estimatedTime} onChange={handleResourceChange} className="form-input"/>
                        <button onClick={addResource} className="btn btn-primary"> Add Resource to Path </button>
                    </div>
                    {resources.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3>Current Path Resources (Drag to Reorder)</h3>
                            <DragDropContext onDragEnd={handleOnDragEnd}>
                                <Droppable droppableId="resources">
                                    {(provided) => (
                                        <ul className="resource-list" {...provided.droppableProps} ref={provided.innerRef}>
                                            {resources.map((res, index) => (
                                                <Draggable key={res.tempId} draggableId={res.tempId} index={index}>
                                                    {(provided) => (
                                                        <li className="resource-item" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ ...provided.draggableProps.style }}>
                                                            <div className="resource-item-details"> <strong>{index + 1}. {res.title} ({res.type})</strong><br /> <small> {res.description} ({res.estimatedTime} mins) </small> </div>
                                                            <div className="resource-item-actions"> {res.type === 'quiz' && (<button onClick={() => openQuizEditor(index)} className="btn btn-secondary"> Edit Quiz ({res.questions?.length || 0} Qs) </button>)} <button onClick={() => removeResource(index)} className="btn btn-danger"> Remove </button> </div>
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
                     <button onClick={submitPath} className="btn btn-submit"> Create Learning Path </button>
                 </section>


                 {/* --- Manage Paths Section --- */}
                 <section className="dashboard-section">
                    <h2>Manage Your Learning Paths</h2>
                    {pathError && <p style={{ color: 'red' }}>Error: {pathError}</p>}
                    {pathMessage && <p style={{ color: 'green' }}>{pathMessage}</p>}
                    {/* --- Use loadingPaths state here --- */}
                    {loadingPaths ? <p>Loading your paths...</p> : (
                        myPaths.length === 0 ? <p>You haven't created any paths yet.</p> : (
                            <ul className="manage-paths-list">
                                {myPaths.map((path) => (
                                    <li key={path.id} className="manage-path-item">
                                        <span className="path-item-title">{path.title}</span>
                                        <div className="path-item-actions">
                                             <span className={`path-status ${path.is_public ? 'public' : 'private'}`}>{path.is_public ? 'Public' : 'Private'}</span>
                                             <button onClick={() => handleToggleVisibility(path.id, path.is_public)} className="btn btn-secondary toggle-vis-btn"> Make {path.is_public ? 'Private' : 'Public'} </button>
                                             {/* --- RE-ADDED PREVIEW BUTTON --- */}
                                             <button
                                                 onClick={() => navigate(`/path/view/${path.id}`, { state: { preview: true } })}
                                                 className="btn btn-secondary preview-btn" // Use CSS class
                                             >
                                                 Preview
                                             </button>
                                             {/* --- END PREVIEW BUTTON --- */}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                 </section>

                 {/* --- Modal Rendering --- */}
                 {isModalOpen && (
                     <QuizBuilderModal
                         resource={resources[editingResourceIndex]}
                         onSave={handleSaveQuiz}
                         onCancel={handleCancelQuiz}
                     />
                 )}
            </div> {/* End creator-dashboard */}
        </div> // End creator-dashboard-wrapper
    );
};

export default CreateDashboard;