import React, { useEffect, useState, useContext } from "react";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import ProgressBar from "../learnerview/ProgressBar";
import "../../styles/learnerDashboard.css"; // Ensure CSS is imported
import { useNavigate, Link } from "react-router-dom"; // Import Link

const LearnerDashboard = () => {
    const { user, logout } = useContext(AuthContext); // Get user and logout
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [enrolledPaths, setEnrolledPaths] = useState([]);
    const [recommendedPaths, setRecommendedPaths] = useState([]);

    const fetchLearningPaths = async () => {
        try {
            setLoading(true); // Ensure loading starts
            const res = await API.get("/learner/learning-paths");
            const allPaths = res.data;
            const enrolled = allPaths.filter(path => path.registered);
            const recommended = allPaths.filter(path => !path.registered);
            setEnrolledPaths(enrolled);
            setRecommendedPaths(recommended);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching learning paths:", err.response || err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLearningPaths();
    }, []);

    const registerPath = async (pathId) => {
        try {
            await API.post("/learner/register-path", { path_id: pathId });
            fetchLearningPaths(); // Refetch to update lists
        } catch (err) {
            console.error("Error registering path:", err.response || err);
        }
    };

    if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Loading learning paths...</p>; // Added basic loading style

    // --- UPDATED PathCard helper component ---
  const PathCard = ({ path, isResumeCard = false }) => (
    // Keep the main div and its onClick
    <div 
      key={path.id} 
      className={`path-card ${isResumeCard ? 'resume-card' : ''}`}
      onClick={() => navigate(`/path/${path.id}`)} 
    >
      <div className="path-header">
        <img
          src={path.image_url ? path.image_url : '/assets/default_course.png'}
          alt={path.title}
          className="path-image"
        />
        <div className="path-info">
          <h3>{path.title}</h3>
          <p>{path.short_description}</p>
          {path.registered && (
            <>
              <ProgressBar progress={path.progress || 0} />
              <p>{path.progress || 0}% completed</p>
            </>
          )}
        </div>
      </div>

      {/* --- Button Logic --- */}
      <div className="path-card-actions"> {/* Optional: Wrapper for buttons */}
        
        {/* --- ADD THIS: Show "Continue" if registered BUT NOT complete --- */}
        {path.registered && !path.completed && (
          <button
            className="continue-learning-btn" // Use a distinct class for styling
            onClick={(e) => {
              e.stopPropagation(); // Stop card navigation
              navigate(`/path/${path.id}`); // Navigate when button clicked
            }}
          >
            Continue Learning
          </button>
        )}
        {/* --- END OF ADDED BUTTON --- */}

        {/* Show "Register" button if NOT registered */}
        {!path.registered && (
          <button
            className="register-btn"
            onClick={(e) => {
              e.stopPropagation();
              registerPath(path.id);
            }}
          >
            Register for this Path
          </button>
        )}

        {/* Show "Certificate" button if COMPLETED */}
        {path.completed && (
          <a
            href={`${API.defaults.baseURL}/learner/certificate/${path.id}?token=${localStorage.getItem('token')}`}
            className="certificate-btn"
            onClick={(e) => e.stopPropagation()} 
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', textAlign: 'center' }}
          >
            Download Certificate
          </a>
        )}
      </div> {/* End button wrapper */}
    </div>
  );

    // Logout Handler
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get user initials for avatar
    const getUserInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (parts[0] && parts[0][0]) {
             return parts[0][0].toUpperCase();
        }
        return '?';
    };

    return (
        <div className="dashboard-layout">

            {/* --- Sidebar --- */}
            <div className="sidebar">
                <div className="sidebar-header">My Learning</div>
                <nav className="sidebar-nav">
                    <Link to="/Dashboard/LearnerDashboard" className="sidebar-link active">
                        Dashboard
                    </Link>
                    <Link to="/my-certificates" className="sidebar-link">
                        My Certificates
                    </Link>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </div>
            {/* --- END Sidebar --- */}

            {/* --- Main Content Area --- */}
            <div className="dashboard-main-content">

                {/* --- UPDATED HEADER --- */}
                <div className="dashboard-header-content">
                    <div className="user-avatar">
                        {getUserInitials(user?.name)}
                    </div>
                    <div>
                        <h2>Welcome back, {user?.name || user?.email}!</h2>
                        <p className="header-subtitle">Keep up the great work!</p>
                    </div>
                </div>
                {/* --- END UPDATED HEADER --- */}

                {/* --- SECTION 1: PICK UP WHERE YOU LEFT OFF --- */}
                <section className="dashboard-section">
                    <h3>Pick up where you left off</h3>
                    <div className="paths-container">
                        {enrolledPaths.length > 0 ? (
                            enrolledPaths.map((path, index) => (
                                <PathCard
                                    path={path}
                                    key={path.id}
                                    isResumeCard={index === 0} // Mark the first one
                                />
                            ))
                        ) : (
                            <p className="empty-state-message">You haven't enrolled in any paths yet. Find your next learning adventure below!</p>
                        )}
                    </div>
                </section>

                {/* --- SECTION 2: RECOMMENDED FOR YOU --- */}
                <section className="dashboard-section">
                    <h3>Recommended for you</h3>
                    <div className="paths-container">
                        {recommendedPaths.length > 0 ? (
                            recommendedPaths.map(path => (
                                <PathCard path={path} key={path.id} />
                            ))
                        ) : (
                            <p className="empty-state-message">You've enrolled in all available paths!</p>
                        )}
                    </div>
                </section>

            </div>
            {/* --- END Main Content --- */}
        </div>
    );
};

export default LearnerDashboard;