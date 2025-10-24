import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api';
import '../../styles/MyCertificates.css';
import '../../styles/learnerDashboard.css';

const MyCertificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    const downloadCertificate = async (pathId) => {
        try {
            const response = await API.get(`/learner/certificate/${pathId}`, {
                responseType: 'blob'
            });
            
            // Create a blob URL and trigger download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `certificate_${pathId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading certificate:', error);
            alert('Failed to download certificate. Please try again.');
        }
    };

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
            }
        };
        fetchCertificates();
    }, []);

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">My Learning</div>
                <nav className="sidebar-nav">
                    <Link to="/Dashboard/LearnerDashboard" className="sidebar-link">Dashboard</Link>
                    <Link to="/my-certificates" className="sidebar-link active">My Certificates</Link>
                </nav>
            </div>

            {/* Main Content */}
            <div className="dashboard-main-content certificates-page">
                <div className="certificates-header">
                    <div>
                        <h1>🏆 My Certificates</h1>
                        <p className="certificates-subtitle">
                            Your achievements and completed learning paths
                        </p>
                    </div>
                    <Link to="/Dashboard/LearnerDashboard" className="back-link-button">
                        ← Back to Dashboard
                    </Link>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading your certificates...</p>
                    </div>
                ) : certificates.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📜</div>
                        <h2>No Certificates Yet</h2>
                        <p>Complete learning paths to earn certificates and showcase your achievements!</p>
                        <Link to="/Dashboard/LearnerDashboard" className="cta-button">
                            Explore Learning Paths →
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="certificates-stats">
                            <div className="stat-card">
                                <span className="stat-number">{certificates.length}</span>
                                <span className="stat-label">Certificates Earned</span>
                            </div>
                        </div>

                        <div className="certificates-grid">
                            {certificates.map(cert => (
                                <div key={cert.id} className="certificate-card">
                                    <div className="certificate-card-header">
                                        <div className="certificate-badge">
                                            <span className="badge-icon">🎓</span>
                                        </div>
                                        <div className="certificate-ribbon">Certified</div>
                                    </div>
                                    
                                    <div className="certificate-card-body">
                                        <h3 className="certificate-title">
                                            {cert.path_title || 'Unknown Path Title'}
                                        </h3>
                                        
                                        <div className="certificate-meta">
                                            <div className="meta-item">
                                                <span className="meta-icon">📅</span>
                                                <span className="meta-text">
                                                    Issued on {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', { 
                                                        year: 'numeric', 
                                                        month: 'long', 
                                                        day: 'numeric' 
                                                    }) : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="meta-item">
                                                <span className="meta-icon">🆔</span>
                                                <span className="meta-text">ID: #{cert.id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="certificate-card-footer">
                                        <button
                                            onClick={() => downloadCertificate(cert.path_id)}
                                            className="download-button"
                                        >
                                            <span className="button-icon">⬇</span>
                                            Download PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MyCertificates;