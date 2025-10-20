import React, { useState, useEffect } from "react";
import API from "../../api";
import "../../styles/CreatorDashboard.css";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// --- QuizBuilderModal (Keep your working code) ---
function QuizBuilderModal({ resource, onSave, onCancel }) {
    const [questions, setQuestions] = useState(resource.questions || []);
    // Dummy save/cancel for now if not implemented
    const handleSave = () => { onSave(questions); };
    return (
        <div className="modal-backdrop"> <div className="modal-content">
             <h2>Quiz Builder: {resource.title}</h2>
             {/* Add inputs/logic to manage questions state here */}
             <p>(Quiz questions will be built here)</p>
             <div className="modal-actions">
                 <button type="button" onClick={handleSave} className="btn btn-primary">Save Quiz</button>
                 <button type="button" onClick={onCancel} className="btn btn-danger">Cancel</button>
             </div>
         </div> </div>
    );
}

// --- UPDATED CREATOR DASHBOARD ---
const CreateDashboard = () => {
    // --- State ---
    const [pathTitle, setPathTitle] = useState("");
    const [resources, setResources] = useState([]);
    const [message, setMessage] = useState(""); // General message
    const [image, setImage] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingResourceIndex, setEditingResourceIndex] = useState(null);
    const [newResource, setNewResource] = useState({ title: "", type: "video", url: "", description: "", estimatedTime: "" });
    const [myPaths, setMyPaths] = useState([]);
    const [loadingPaths, setLoadingPaths] = useState(true);
    const [pathError, setPathError] = useState(''); // Path list error
    const [pathMessage, setPathMessage] = useState(''); // Path list message

    // --- Fetch Creator's Paths ---
    const fetchMyPaths = async () => {
        try {
            setLoadingPaths(true); setPathError(''); setPathMessage('');
            const res = await API.get('/paths/mypaths');
            setMyPaths(res.data);
            setLoadingPaths(false);
        } catch (err) {
            console.error("Error fetching creator paths:", err);
            setPathError(err.response?.data?.message || 'Failed to load your paths.');
            setLoadingPaths(false);
        }
    };
    useEffect(() => { fetchMyPaths(); }, []);

    // --- Resource Handling ---
    const handleResourceChange = (e) => setNewResource({ ...newResource, [e.target.name]: e.target.value });
    const addResource = () => {
         if (!newResource.title) { alert("Title required!"); return; }
         if (newResource.type !== 'quiz' && !newResource.url) { alert("URL required!"); return; }
         const resourceToAdd = { ...newResource, tempId: `temp-${Date.now()}-${resources.length}`, order: resources.length, questions: newResource.type === 'quiz' ? [] : undefined };
         setResources([...resources, resourceToAdd]);
         setNewResource({ title: "", type: "video", url: "", description: "", estimatedTime: "" });
    };
    const removeResource = (indexToRemove) => {
         const newResources = resources.filter((_, index) => index !== indexToRemove);
         const reorderedResources = newResources.map((res, index) => ({ ...res, order: index }));
         setResources(reorderedResources);
    };

    // --- Quiz Modal Handling ---
    const openQuizEditor = (index) => { setIsModalOpen(true); setEditingResourceIndex(index); };
    const handleSaveQuiz = (questionsData) => {
        const updatedResources = [...resources];
        updatedResources[editingResourceIndex].questions = questionsData;
        setResources(updatedResources);
        setIsModalOpen(false); setEditingResourceIndex(null);
    };
    const handleCancelQuiz = () => { setIsModalOpen(false); setEditingResourceIndex(null); };

    // --- Drag and Drop Handler ---
    const handleOnDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(resources);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        const updatedItems = items.map((item, index) => ({ ...item, order: index }));
        setResources(updatedItems);
    };

     // --- Path Visibility Toggle ---
     const handleToggleVisibility = async (pathId, currentVisibility) => {
        const newVisibility = !currentVisibility;
        console.log(`[FRONTEND] Toggling path ${pathId} to ${newVisibility ? 'Public' : 'Private'}`); // <-- ADD LOG
        try {
            setPathMessage('');
            setPathError('');
            console.log(`[FRONTEND] Sending PUT request to /creator/paths/${pathId}/visibility`); // <-- ADD LOG
            const res = await API.put(`/creator/paths/${pathId}/visibility`, { is_public: newVisibility });
            console.log("[FRONTEND] API Response:", res.data); // <-- ADD LOG

            // Update state
            setMyPaths(prevPaths =>
                prevPaths.map(p =>
                    p.id === pathId ? { ...p, is_public: newVisibility } : p
                )
            );
            console.log("[FRONTEND] State updated locally."); // <-- ADD LOG
            setPathMessage(`Path set to ${newVisibility ? 'Public' : 'Private'}`);

        } catch (err) {
             console.error("[FRONTEND] Error updating path visibility:", err.response || err); // <-- UPDATED LOG
             setPathError(err.response?.data?.message || 'Failed to update visibility.');
        }
    };

    // --- Submit Path ---
    const submitPath = async () => {
        if (!pathTitle || !image || resources.length === 0) {
           alert("Path title, image, and at least one resource are required!"); return;
        }
        try {
            const formData = new FormData(); // Correct placement
            formData.append("title", pathTitle);
            const resourcesToSend = resources.map(({ tempId, ...rest }) => rest);
            formData.append("resources", JSON.stringify(resourcesToSend));
            formData.append("image", image);
            await API.post("/creator/learning-paths", formData, { headers: { "Content-Type": "multipart/form-data" } });
            setMessage("Learning Path created successfully!");
            setPathTitle(""); setResources([]); setImage(null); fetchMyPaths();
        } catch (err) { alert(err.response?.data?.message || "Error creating path"); }
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

                    {/* Path Title Input */}
                    <input type="text" placeholder="Path Title (e.g., Introduction to Web Development)" value={pathTitle} onChange={(e) => setPathTitle(e.target.value)} className="form-input form-section-full" style={{ marginBottom: '1rem' }}/>

                    {/* Image Upload Input */}
                    <h3>Upload Path Image</h3>
                    <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="form-input" style={{ marginBottom: '1rem' }}/>

                    {/* Add Resource Form */}
                    <h3>Add Resource</h3>
                    <div className="form-section">
                        <input type="text" placeholder="Resource Title" name="title" value={newResource.title} onChange={handleResourceChange} className="form-input"/>
                        <select name="type" value={newResource.type} onChange={handleResourceChange} className="form-input"> <option value="video">Video</option> <option value="article">Article</option> <option value="quiz">Quiz</option> </select>
                        {newResource.type !== 'quiz' && ( <input type="text" placeholder="Resource URL" name="url" value={newResource.url} onChange={handleResourceChange} className="form-input form-section-full"/> )}
                        <input type="text" placeholder="Description" name="description" value={newResource.description} onChange={handleResourceChange} className="form-input"/>
                        <input type="number" placeholder="Estimated Time (minutes)" name="estimatedTime" value={newResource.estimatedTime} onChange={handleResourceChange} className="form-input"/>
                        <button onClick={addResource} className="btn btn-primary"> Add Resource to Path </button>
                    </div>

                    {/* Resource List with DragDropContext */}
                    {resources.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3>Current Path Resources (Drag list item to Reorder)</h3>
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
                     {/* Create Button */}
                     <button onClick={submitPath} className="btn btn-submit"> Create Learning Path </button>
                 </section>

                 {/* --- Manage Paths Section --- */}
                 <section className="dashboard-section">
                    <h2>Manage Your Learning Paths</h2>
                    {pathError && <p style={{ color: 'red' }}>Error: {pathError}</p>}
                    {pathMessage && <p style={{ color: 'green' }}>{pathMessage}</p>}
                    {loadingPaths ? <p>Loading your paths...</p> : (
                        myPaths.length === 0 ? <p>You haven't created any paths yet.</p> : (
                            <ul className="manage-paths-list">
                                {myPaths.map((path) => (
                                    <li key={path.id} className="manage-path-item">
                                        <span className="path-item-title">{path.title}</span>
                                        <div className="path-item-actions">
                                             <span className={`path-status ${path.is_public ? 'public' : 'private'}`}>{path.is_public ? 'Public' : 'Private'}</span>
                                             <button onClick={() => handleToggleVisibility(path.id, path.is_public)} className="btn btn-secondary toggle-vis-btn"> Make {path.is_public ? 'Private' : 'Public'} </button>
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