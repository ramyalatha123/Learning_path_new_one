import React, { useState } from "react";
import API from "../../api";
import "../../styles/CreatorDashboard.css"; // Your existing CSS file

// --- NEW COMPONENT: The Pop-up Modal for building quizzes ---
// We can keep this in the same file to keep it simple
function QuizBuilderModal({ resource, onSave, onCancel }) {
  const [questions, setQuestions] = useState(resource.questions || []);
  const [newQuestionText, setNewQuestionText] = useState("");

  const addQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQuestion = {
      text: newQuestionText,
      options: [
        { text: "", isCorrect: true }, // Start with one correct option
        { text: "", isCorrect: false },
      ],
    };
    setQuestions([...questions, newQuestion]);
    setNewQuestionText("");
  };

  const updateQuestionText = (qIndex, text) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].text = text;
    setQuestions(updatedQuestions);
  };

  const updateOption = (qIndex, oIndex, field, value) => {
    const updatedQuestions = [...questions];
    if (field === 'isCorrect') {
      // Set all other options to false
      updatedQuestions[qIndex].options.forEach((opt, i) => {
        opt.isCorrect = i === oIndex;
      });
    } else {
      updatedQuestions[qIndex].options[oIndex][field] = value;
    }
    setQuestions(updatedQuestions);
  };

  const addOption = (qIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options.push({ text: "", isCorrect: false });
    setQuestions(updatedQuestions);
  };

  const handleSave = () => {
    // Validate quiz
    if (questions.length === 0) {
      alert("Please add at least one question.");
      return;
    }
    onSave(questions);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Quiz Builder: {resource.title}</h2>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="quiz-question-builder">
            <input
              type="text"
              placeholder="Question Text"
              value={q.text}
              onChange={(e) => updateQuestionText(qIndex, e.target.value)}
              className="form-input form-section-full"
            />
            <div className="quiz-options-builder">
              {q.options.map((o, oIndex) => (
                <div key={oIndex} className="quiz-option-input">
                  <input
                    type="radio"
                    name={`correct-answer-${qIndex}`}
                    checked={o.isCorrect}
                    onChange={(e) => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)}
                  />
                  <input
                    type="text"
                    placeholder={`Option ${oIndex + 1}`}
                    value={o.text}
                    onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                  />
                </div>
              ))}
              <button type="button" onClick={() => addOption(qIndex)}>+ Add Option</button>
            </div>
          </div>
        ))}
        <div className="form-section">
          <input
            type="text"
            placeholder="New Question Title..."
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            className="form-input"
          />
          <button type="button" onClick={addQuestion} className="btn btn-secondary">
            Add Question
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={handleSave} className="btn btn-primary">Save Quiz</button>
          <button type="button" onClick={onCancel} className="btn btn-danger">Cancel</button>
        </div>
      </div>
    </div>
  );
}
// --- END OF NEW MODAL COMPONENT ---


// --- YOUR UPDATED CREATOR DASHBOARD ---
const CreateDashboard = () => {
  const [pathTitle, setPathTitle] = useState("");
  const [resources, setResources] = useState([]);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);

  // --- NEW STATE for the quiz builder modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResourceIndex, setEditingResourceIndex] = useState(null);
  // ---

  const [newResource, setNewResource] = useState({
    title: "",
    type: "video", // <-- NEW: Default type
    url: "",
    description: "",
    estimatedTime: "",
  });

  const handleResourceChange = (e) => {
    setNewResource({ ...newResource, [e.target.name]: e.target.value });
  };

  const addResource = () => {
    // Check for title (all types)
    if (!newResource.title) {
      alert("Title is required!");
      return;
    }
    // Check for URL (only video/article)
    if (newResource.type !== 'quiz' && !newResource.url) {
      alert("URL is required for this resource type!");
      return;
    }

    // If it's a quiz, add an empty questions array
    const resourceToAdd = {
      ...newResource,
      questions: newResource.type === 'quiz' ? [] : undefined,
    };

    setResources([...resources, resourceToAdd]);
    // Reset form
    setNewResource({
      title: "",
      type: "video",
      url: "",
      description: "",
      estimatedTime: "",
    });
  };

  const removeResource = (index) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  // --- NEW functions to handle the modal ---
  const openQuizEditor = (index) => {
    setEditingResourceIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveQuiz = (questions) => {
    const updatedResources = [...resources];
    updatedResources[editingResourceIndex].questions = questions;
    setResources(updatedResources);
    setIsModalOpen(false);
    setEditingResourceIndex(null);
  };

  const handleCancelQuiz = () => {
    setIsModalOpen(false);
    setEditingResourceIndex(null);
  };
  // ---

  const submitPath = async () => {
    // ... (your existing checks for title, image are good) ...

    try {
      const formData = new FormData();
      formData.append("title", pathTitle);
      // We now stringify the *full* resources array, including quiz questions
      formData.append("resources", JSON.stringify(resources)); 
      formData.append("image", image);

      const res = await API.post("/creator/learning-paths", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Learning Path created successfully!");
      setPathTitle("");
      setResources([]);
      setImage(null);
    } catch (err) {
      console.error("Error creating learning path:", err.response || err);
      alert(err.response?.data?.message || "Error creating learning path");
    }
  };

  return (
    <div className="creator-dashboard">
      <h2>Create Learning Path</h2>

      {/* --- Path Title and Image (no change) --- */}
      <input
        type="text"
        placeholder="Path Title"
        value={pathTitle}
        onChange={(e) => setPathTitle(e.target.value)}
        className="form-input form-section-full"
      />
      <h3>Upload Image</h3>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
        className="form-input"
      />

      {/* --- UPDATED "Add Resource" Form --- */}
      <h3>Add Resource</h3>
      <div className="form-section">
        <input
          type="text"
          placeholder="Resource Title"
          name="title" // <-- Added name
          value={newResource.title}
          onChange={handleResourceChange}
          className="form-input"
        />
        <select
          name="type" // <-- Added name
          value={newResource.type}
          onChange={handleResourceChange}
          className="form-input"
        >
          <option value="video">Video</option>
          <option value="article">Article</option>
          <option value="quiz">Quiz</option>
        </select>
        
        {/* --- Conditionally show URL input --- */}
        {newResource.type !== 'quiz' && (
          <input
            type="text"
            placeholder="Resource URL"
            name="url" // <-- Added name
            value={newResource.url}
            onChange={handleResourceChange}
            className="form-input form-section-full"
          />
        )}

        <input
          type="text"
          placeholder="Description"
          name="description" // <-- Added name
          value={newResource.description}
          onChange={handleResourceChange}
          className="form-input"
        />
        <input
          type="number"
          placeholder="Estimated Time (minutes)"
          name="estimatedTime" // <-- Added name
          value={newResource.estimatedTime}
          onChange={handleResourceChange}
          className="form-input"
        />
        <button onClick={addResource} className="btn btn-primary">
          Add Resource to Path
        </button>
      </div>

      {/* --- UPDATED Resource List --- */}
      {resources.length > 0 && (
        <div>
          <h3>Current Path Resources</h3>
          <ul className="resource-list">
            {resources.map((res, i) => (
              <li key={i} className="resource-item">
                <div className="resource-item-details">
                  <strong>{res.title} ({res.type})</strong>
                  <br />
                  <small>
                    {res.description} ({res.estimatedTime} mins)
                  </small>
                </div>
                <div>
                  {/* Show "Edit Quiz" button only for quizzes */}
                  {res.type === 'quiz' && (
                    <button onClick={() => openQuizEditor(i)} className="btn btn-secondary">
                      Edit Quiz ({res.questions?.length || 0} Qs)
                    </button>
                  )}
                  <button onClick={() => removeResource(i)} className="btn btn-danger">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={submitPath} className="btn btn-submit">
        Create Learning Path
      </button>

      {message && <p className="success-message">{message}</p>}

      {/* --- NEW: Render the modal if it's open --- */}
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

export default CreateDashboard;