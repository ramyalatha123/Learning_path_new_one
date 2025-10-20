import React, { useState, useEffect } from 'react'; // Removed unused useContext
import { Link } from 'react-router-dom';
// Removed AuthContext import
import API from '../../api'; // Keep API import
import '../../styles/MyCertificates.css'; // Import your specific styles
import '../../styles/learnerDashboard.css'; // Import sidebar styles

const MyCertificates = () => {
    // Keep state variables
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Keep useEffect for fetching data
    useEffect(() => {
        const fetchCertificates = async () => {
            setLoading(true);
            console.log("[FRONTEND] Fetching certificates...");
            try {
                const res = await API.get('/learner/my-certificates');
                console.log("[FRONTEND] Received certificates:", res.data);
                setCertificates(res.data);
            } catch (error) {
                console.error("[FRONTEND] Error fetching certificates:", error.response || error);
            } finally {
                setLoading(false);
                console.log("[FRONTEND] Finished fetching certificates.");
            }
        };
        fetchCertificates();
    }, []); // Empty dependency array

    // Keep the log for checking state during render
    console.log("[MyCertificates] Rendering component. Loading:", loading, "Certificates count:", certificates.length, "Data:", certificates);

    return (
        // Keep the layout structure
        <div className="dashboard-layout">

             {/* --- Sidebar --- */}
             <div className="sidebar">
                <div className="sidebar-header">My Learning</div>
                <nav className="sidebar-nav">
                  <Link to="/Dashboard/LearnerDashboard" className="sidebar-link"> Dashboard </Link>
                  <Link to="/my-certificates" className="sidebar-link active"> My Certificates </Link>
                </nav>
                <div className="sidebar-footer">
                  {/* <button onClick={handleLogout} className="logout-button"> Logout </button> */}
                 </div>
            </div>
            {/* --- End Sidebar --- */}

            {/* --- Main Content Area --- */}
            <div className="dashboard-main-content certificates-page">
                <h1>My Certificates</h1>

                {loading ? (
                    <div className="loading-certificates">Loading your certificates...</div>
                ) : certificates.length === 0 ? (
                    // Empty State Message
                    <div className="no-certificates-message">
                         <p><strong>No Certificates Earned Yet!</strong></p>
                         <p>Complete learning paths to earn certificates and showcase your achievements.</p>
                         <Link to="/Dashboard/LearnerDashboard" className="browse-paths-button">
                             Explore Learning Paths
                         </Link>
                    </div>
                ) : (
                    // Certificate List
                    <ul className="certificate-list">
                        {certificates.map(cert => (
                            <li key={cert.id} className="certificate-item">
                                <div className="certificate-icon">📜</div>
                                <div className="certificate-details">
                                    {/* --- FIX 1: Use cert.path_title --- */}
                                    <strong>{cert.path_title || 'Unknown Path Title'}</strong>

                                    {/* --- FIX 2: Format cert.issue_date safely --- */}
                                    <small>Issued on: {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : 'N/A'}</small>
                                </div>
                                {/* Download Link */}
                                <a
                                    href={`${API.defaults.baseURL}/learner/certificate/${cert.path_id}?token=${localStorage.getItem('token')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="download-certificate-link"
                                >
                                    Download PDF
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
                 {/* Optional: Add Back to Dashboard link if needed outside the empty state */}
                 { !loading && <Link style={{marginTop: '1rem', display: 'inline-block'}} to="/Dashboard/LearnerDashboard">← Back to Dashboard</Link> }
            </div>
        </div>
    );
};

export default MyCertificates;