import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Keep context for potential future use
import API from '../../api'; // Keep API import
import '../../styles/MyCertificates.css'; // <-- Import the new CSS file
import '../../styles/learnerDashboard.css'; // <-- Import sidebar styles too


const MyCertificates = () => {
    // const { user } = useContext(AuthContext); // Keep user if needed later
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true); // Start loading

    useEffect(() => {
        // TODO: Replace mock data with actual API call when backend is ready
        const fetchCertificates = async () => {
             setLoading(true);
            try {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // MOCK DATA (Replace with actual API call)
                // Assuming your API returns an array like this
                 const mockData = [
                     { id: 1, pathId: 1, pathTitle: 'Full Stack Development', issueDate: '2025-10-19' },
                     { id: 2, pathId: 2, pathTitle: 'Python complete Bootcamp', issueDate: '2025-10-18' },
                     // Add more mock certificates if you like
                 ];
                // Use this line to test the empty state:
                // const mockData = []; 
                setCertificates(mockData);

            } catch (error) {
                console.error("Error fetching certificates:", error);
                // Handle error state if needed
            } finally {
                setLoading(false);
            }
        };
        fetchCertificates();
    }, []);

    return (
        // Use the same layout as LearnerDashboard for consistency
        <div className="dashboard-layout">
            
             {/* --- Sidebar (Include if you want it on this page too) --- */}
             <div className="sidebar">
                <div className="sidebar-header">My Learning</div>
                <nav className="sidebar-nav">
                  <Link to="/Dashboard/LearnerDashboard" className="sidebar-link"> Dashboard </Link>
                  <Link to="/my-certificates" className="sidebar-link active"> My Certificates </Link> 
                </nav>
                {/* Add Logout button if needed */}
                <div className="sidebar-footer">
                  {/* <button onClick={handleLogout} className="logout-button"> Logout </button> */}
                 </div>
            </div>
            {/* --- End Sidebar --- */}

            {/* --- Main Content Area --- */}
            <div className="dashboard-main-content certificates-page"> {/* Added specific class */}
                <h1>My Certificates</h1>

                {loading ? (
                    <div className="loading-certificates">Loading your certificates...</div>
                ) : certificates.length === 0 ? (
                    // --- Nicer Empty State ---
                    <div className="no-certificates-message">
                         {/* Optional: Add an icon or image here */}
                         {/*  */}
                         <p><strong>No Certificates Earned Yet!</strong></p>
                         <p>Complete learning paths to earn certificates and showcase your achievements.</p>
                         <Link to="/Dashboard/LearnerDashboard" className="browse-paths-button">
                             Explore Learning Paths
                         </Link>
                    </div>
                    // --- End Empty State ---
                ) : (
                    // --- Certificate List ---
                    <ul className="certificate-list">
                        {certificates.map(cert => (
                            <li key={cert.id} className="certificate-item">
                                <div className="certificate-icon">📜</div> {/* Simple icon */}
                                <div className="certificate-details">
                                    <strong>{cert.pathTitle}</strong>
                                    <small>Issued on: {new Date(cert.issueDate).toLocaleDateString()}</small>
                                </div>
                                {/* Link to download */}
                                <a
                                    href={`${API.defaults.baseURL}/learner/certificate/${cert.pathId}?token=${localStorage.getItem('token')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="download-certificate-link"
                                >
                                    Download PDF
                                </a>
                            </li>
                        ))}
                    </ul>
                    // --- End Certificate List ---
                )}
            </div>
        </div>
    );
};

export default MyCertificates;