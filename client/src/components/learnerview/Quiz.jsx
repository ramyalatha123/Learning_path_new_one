import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import '../../styles/Quiz.css'; // Make sure CSS is imported

const Quiz = () => {
    const { resourceId } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);

    // Fetch quiz questions (Keep existing useEffect)
    useEffect(() => {
        const fetchQuiz = async () => {
            // --- ADD LOGS ---
            console.log("[Quiz.jsx] useEffect running for resourceId:", resourceId);
            if (!resourceId) {
                console.error("[Quiz.jsx] No resourceId found in URL!");
                setLoading(false); // Stop loading if no ID
                return;
            }
            // --- END LOGS ---

            try {
                setLoading(true); // Start loading
                 // --- ADD LOGS ---
                console.log(`[Quiz.jsx] Attempting to fetch: /learner/quiz/${resourceId}`);
                 // --- END LOGS ---
                const res = await API.get(`/learner/quiz/${resourceId}`);
                 // --- ADD LOGS ---
                console.log("[Quiz.jsx] API Response:", res.data);
                 // --- END LOGS ---
                setQuestions(res.data);
                setLoading(false);
            } catch (err) {
                 // --- ADD LOGS ---
                console.error("[Quiz.jsx] Error fetching quiz:", err.response || err);
                 // --- END LOGS ---
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [resourceId]);

    // Handle answer selection (Keep existing)
   const handleAnswerSelect = (questionId, optionId) => {
    // --- ADDED LOGS ---
    console.log(`[Quiz.jsx] handleAnswerSelect called. QID: ${questionId}, OptionID: ${optionId}`);
    // --- END LOGS ---

    // Update the answers state
    setAnswers(prevAnswers => {
        const newAnswers = {
            ...prevAnswers, // Keep previous answers for other questions
            [questionId]: optionId, // Add or update the answer for this question
        };
        // --- ADDED LOG ---
        console.log("[Quiz.jsx] answers state is now:", newAnswers);
        // --- END LOG ---
        return newAnswers; // Return the new state object
    });
};

    // Submit quiz (Keep existing)
    const handleSubmit = async () => {
    // --- ADDED LOGS ---
    console.log("[Quiz.jsx] Submit button clicked.");
    console.log("[Quiz.jsx] Current answers state:", JSON.stringify(answers)); // Log the answers being sent

    // Basic validation: Check if answers object is empty
    if (Object.keys(answers).length === 0) {
        alert("Please answer at least one question before submitting.");
        console.log("[Quiz.jsx] No answers selected, submit aborted.");
        return; // Stop if no answers
    }
    // --- END LOGS ---

    try {
      // --- ADDED LOGS ---
      console.log(`[Quiz.jsx] Preparing to send POST request to /learner/quiz/submit`);
      const payload = { resourceId: parseInt(resourceId, 10), answers }; // Ensure resourceId is a number if needed
      console.log("[Quiz.jsx] Sending payload:", JSON.stringify(payload));
      // --- END LOGS ---

      // Make the API call
      const res = await API.post('/learner/quiz/submit', payload);

      // --- ADDED LOGS ---
      console.log("[Quiz.jsx] Received API Response from submit:", res.data);
      // --- END LOGS ---

      // Update state to show results
      setResult(res.data); // Expects { score: ..., passed: ... }

      // Optional: Mark resource complete on frontend if passed (backend also does this)
      if (res.data.passed) {
        console.log("[Quiz.jsx] Quiz passed! (Backend should mark resource complete).");
        // You could optionally call the completeResource API again from here,
        // but the backend logic for /quiz/submit should already handle it.
      } else {
           console.log("[Quiz.jsx] Quiz not passed.");
      }
    } catch (err) {
      // --- ADDED LOGS ---
      // Log the full error object from Axios if possible
      console.error("[Quiz.jsx] !!! ERROR submitting quiz:", err.response ? err.response.data : err.message, err);
      // --- END LOGS ---
      alert("Error submitting quiz. Please check the console and try again.");
    }
  };

    if (loading) return <div className="quiz-loading">Loading Quiz...</div>; // Use class for styling

    // Result Screen (Keep existing)
    if (result) {
        return (
            <div className="quiz-layout"> {/* Use layout container */}
                 <div className="quiz-header"> {/* Add header */}
                    <h2>Quiz Results</h2>
                 </div>
                 <div className="quiz-content result-content"> {/* Add content wrapper */}
                    <h3>Your Score: {result.score}%</h3>
                    <p>{result.passed ? "Congratulations, you passed!" : "Keep trying!"}</p>
                    <button onClick={() => navigate(-1)} className="back-button">Back to Path</button>
                 </div>
            </div>
        );
    }

    // Quiz Display
    return (
        // --- ADD Main Layout Div ---
        <div className="quiz-layout">
            {/* --- ADD Header Div --- */}
            <div className="quiz-header">
                <h2>Quiz Time!</h2>
                 {/* Optional: Add quiz title here if available */}
                 {/* <p>Quiz for Resource ID: {resourceId}</p> */}
            </div>

            {/* --- ADD Content Div for Scrolling --- */}
            <div className="quiz-content">
                {questions.map((q) => (
                    <div key={q.id} className="quiz-question">
                        <h4>{q.question_text}</h4>
                        <div className="quiz-options">
                            {q.options.map((o) => (
                                <label key={o.id}>
                                    <input
                                        type="radio"
                                        name={`question-${q.id}`}
                                        onChange={() => handleAnswerSelect(q.id, o.id)}
                                    />
                                    {o.option_text}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
                <button onClick={handleSubmit} className="btn btn-submit">Submit Quiz</button>
            </div>
            {/* --- END Content Div --- */}
        </div>
        // --- END Main Layout Div ---
    );
};

export default Quiz;