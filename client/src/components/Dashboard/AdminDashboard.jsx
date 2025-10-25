import React, { useState, useEffect, useContext } from 'react';
import API from '../../api';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [userError, setUserError] = useState('');
    const [userMessage, setUserMessage] = useState('');

    const [paths, setPaths] = useState([]);
    const [loadingPaths, setLoadingPaths] = useState(true);
    const [pathError, setPathError] = useState('');
    const [pathMessage, setPathMessage] = useState('');

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            setUserError('');
            setUserMessage('');
            const res = await API.get('/admin/users');
            setUsers(res.data);
            setLoadingUsers(false);
        } catch (err) {
            console.error("Error fetching users:", err);
            setUserError(err.response?.data?.message || 'Failed to fetch users.');
            setLoadingUsers(false);
        }
    };

    const fetchPaths = async () => {
        try {
            setLoadingPaths(true);
            setPathError('');
            setPathMessage('');
            const res = await API.get('/admin/paths');
            setPaths(res.data);
            setLoadingPaths(false);
        } catch (err) {
            console.error("Error fetching paths:", err);
            setPathError(err.response?.data?.message || 'Failed to fetch paths.');
            setLoadingPaths(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchPaths();
    }, []);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            setUserError('');
            setUserMessage('');
            const res = await API.delete(`/admin/users/${userId}`);
            setUserMessage(res.data.message);
            fetchUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
            setUserError(err.response?.data?.message || 'Failed to delete user.');
        }
    };

    const handleDeletePath = async (pathId) => {
        if (!window.confirm('Delete this Learning Path? This affects all users.')) return;
        try {
            setPathError('');
            setPathMessage('');
            const res = await API.delete(`/admin/paths/${pathId}`);
            setPathMessage(res.data.message);
            fetchPaths();
        } catch (err) {
            console.error("Error deleting path:", err);
            setPathError(err.response?.data?.message || 'Failed to delete path.');
        }
    };

    if (loadingUsers || loadingPaths) {
        return (
            <div className="admin-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            
            {/* Header */}
            <div className="admin-header">
                <div className="header-content">
                    <div>
                        <h1>🛡️ Admin Dashboard</h1>
                        <p>Welcome, {user?.name || user?.email}!</p>
                    </div>
                    <div className="stats-summary">
                        <div className="stat-box">
                            <span className="stat-number">{users.length}</span>
                            <span className="stat-label">Total Users</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-number">{paths.length}</span>
                            <span className="stat-label">Total Paths</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="admin-content">
                
                {/* User Management Section */}
                <section className="admin-section">
                    <div className="section-header">
                        <h2>👥 User Management</h2>
                    </div>
                    
                    {userError && (
                        <div className="alert alert-error">
                            <span className="alert-icon">⚠️</span>
                            {userError}
                        </div>
                    )}
                    {userMessage && (
                        <div className="alert alert-success">
                            <span className="alert-icon">✅</span>
                            {userMessage}
                        </div>
                    )}
                    
                    {users.length === 0 ? (
                        <div className="empty-state-small">
                            <p>No users found.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <span className="id-badge">#{u.id}</span>
                                            </td>
                                            <td>
                                                <span className="user-name">{u.name}</span>
                                            </td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className={`role-badge ${u.role}`}>
                                                    {u.role === 'creator' ? '🎨' : '📚'} {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="btn-delete"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Path Management Section */}
                <section className="admin-section">
                    <div className="section-header">
                        <h2>📚 Learning Path Management</h2>
                    </div>
                    
                    {pathError && (
                        <div className="alert alert-error">
                            <span className="alert-icon">⚠️</span>
                            {pathError}
                        </div>
                    )}
                    {pathMessage && (
                        <div className="alert alert-success">
                            <span className="alert-icon">✅</span>
                            {pathMessage}
                        </div>
                    )}
                    
                    {paths.length === 0 ? (
                        <div className="empty-state-small">
                            <p>No learning paths found.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>Creator</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paths.map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                <span className="id-badge">#{p.id}</span>
                                            </td>
                                            <td>
                                                <span className="path-title">{p.title}</span>
                                            </td>
                                            <td>{p.creator_email}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleDeletePath(p.id)}
                                                    className="btn-delete"
                                                >
                                                    🗑️ Delete Path
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
};

export default AdminDashboard;