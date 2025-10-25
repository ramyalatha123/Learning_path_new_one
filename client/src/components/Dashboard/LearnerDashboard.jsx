import React, { useEffect, useState, useContext } from "react";
import API from "../../api";
import { AuthContext } from "../../context/AuthContext";
import ProgressBar from "../learnerview/ProgressBar";
import "../../styles/learnerDashboard.css";
import { useNavigate, Link } from "react-router-dom";

const BACKEND_URL_BASE = process.env.REACT_APP_API_URL 
    ? process.env.REACT_APP_API_URL.replace('/api', '') 
    : 'http://localhost:5000';

const LearnerDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [enrolledPaths, setEnrolledPaths] = useState([]);
    const [recommendedPaths, setRecommendedPaths] = useState([]);

    const fetchLearningPaths = async () => {
        try {
            setLoading(true);
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
            fetchLearningPaths();
        } catch (err) {
            console.error("Error registering path:", err.response || err);
        }
    };

    if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Loading learning paths...</p>;

    // ✅ PathCard for ENROLLED paths - Card IS clickable!
    const EnrolledPathCard = ({ path, isResumeCard = false }) => (
        <div 
            key={path.id} 
            className={`path-card ${isResumeCard ? 'resume-card' : ''}`}
            onClick={() => navigate(`/path/view/${path.id}`)} // ✅ Card is clickable for enrolled!
            style={{ cursor: 'pointer' }}
        >
            <div className="path-header">
                <img
                    src={path.image_url ? `${BACKEND_URL_BASE}${path.image_url}` : `${BACKEND_URL_BASE}/assets/default_course.png`}
                    alt={path.title}
                    className="path-image"
                />
                <div className="path-info">
                    <h3>{path.title}</h3>
                    <p>{path.short_description}</p>
                    <ProgressBar progress={path.progress || 0} />
                    <p>{path.progress || 0}% completed</p>
                </div>
            </div>

            <div className="path-card-actions">
                {/* Continue Learning Button */}
                {!path.completed && (
                    <button
                        className="continue-learning-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/path/view/${path.id}`);
                        }}
                    >
                        Continue Learning
                    </button>
                )}

                {/* Certificate Button if completed */}
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
            </div>
        </div>
    );

    // ✅ PathCard for RECOMMENDED paths - Card is NOT clickable!
    const RecommendedPathCard = ({ path }) => (
        <div 
            key={path.id} 
            className="path-card"
            // ❌ NO onClick here - card is NOT clickable for recommended!
        >
            <div className="path-header">
                <img
                    src={path.image_url ? `${BACKEND_URL_BASE}${path.image_url}` : `${BACKEND_URL_BASE}/assets/default_course.png`}
                    alt={path.title}
                    className="path-image"
                />
                <div className="path-info">
                    <h3>{path.title}</h3>
                    <p>{path.short_description}</p>
                </div>
            </div>

            <div className="path-card-actions">
                {/* Only View Details button works */}
                <button
                    className="register-btn"
                    onClick={() => navigate(`/path/details/${path.id}`)}
                >
                    View Details & Register
                </button>
            </div>
        </div>
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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

            {/* Sidebar */}
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

            {/* Main Content Area */}
            <div className="dashboard-main-content">

                <div className="dashboard-header-content">
                    <div className="user-avatar">
                        {getUserInitials(user?.name)}
                    </div>
                    <div>
                        <h2>Welcome back, {user?.name || user?.email}!</h2>
                        <p className="header-subtitle">Keep up the great work!</p>
                    </div>
                </div>

                {/* SECTION 1: PICK UP WHERE YOU LEFT OFF */}
                <section className="dashboard-section">
                    <h3>Pick up where you left off</h3>
                    <div className="paths-container">
                        {enrolledPaths.length > 0 ? (
                            enrolledPaths.map((path, index) => (
                                <EnrolledPathCard
                                    path={path}
                                    key={path.id}
                                    isResumeCard={index === 0}
                                />
                            ))
                        ) : (
                            <p className="empty-state-message">You haven't enrolled in any paths yet. Find your next learning adventure below!</p>
                        )}
                    </div>
                </section>

                {/* SECTION 2: RECOMMENDED FOR YOU */}
                <section className="dashboard-section">
                    <h3>Recommended for you</h3>
                    <div className="paths-container">
                        {recommendedPaths.length > 0 ? (
                            recommendedPaths.map(path => (
                                <RecommendedPathCard path={path} key={path.id} />
                            ))
                        ) : (
                            <p className="empty-state-message">You've enrolled in all available paths!</p>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default LearnerDashboard;