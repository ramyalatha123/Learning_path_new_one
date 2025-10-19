import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import '../../styles/Quiz.css';
const Quiz = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({}); // Stores { questionId: optionId }
  const [result, setResult] = useState(null); // Stores { score: 80, message: "..." }

  // 1. Fetch the quiz questions
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // We already built this API route!
        const res = await API.get(`/learner/quiz/${resourceId}`);
        setQuestions(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [resourceId]);

  // 2. Handle when user selects an answer
  const handleAnswerSelect = (questionId, optionId) => {
    setAnswers({
      ...answers,
      [questionId]: optionId,
    });
  };

  // 3. Submit the quiz
  const handleSubmit = async () => {
    try {
      // We will create this API route in the next step
      const res = await API.post('/learner/quiz/submit', { resourceId, answers });
      setResult(res.data); // e.g., { score: 80, passed: true }

      // If they passed, mark the resource as complete
      if (res.data.passed) {
        await API.post(`/learner/complete-resource/${resourceId}`);
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("Error submitting quiz.");
    }
  };

  if (loading) return <div>Loading Quiz...</div>;
  if (result) {
    // Show the result screen
    return (
      <div className="quiz-container">
        <h2>Quiz Results</h2>
        <h3>Your Score: {result.score}%</h3>
        <p>{result.passed ? "Congratulations, you passed!" : "You did not pass. Please review the material and try again."}</p>
        <button onClick={() => navigate(-1)}>Back to Path</button>
      </div>
    );
  }

  // Show the quiz
  return (
    <div className="quiz-container">
      <h2>Quiz Time!</h2>
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
      <button onClick={handleSubmit} className="btn-submit">Submit Quiz</button>
    </div>
  );
};

export default Quiz;