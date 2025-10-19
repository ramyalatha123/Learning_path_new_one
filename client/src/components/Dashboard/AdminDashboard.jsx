import React, { useState, useEffect, useContext } from 'react';
import API from '../../api'; // Adjust path if needed
import { AuthContext } from '../../context/AuthContext'; // Adjust path if needed
import '../../styles/AdminDashboard.css'; // Make sure you import the CSS

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);

    // State for users
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [userError, setUserError] = useState('');
    const [userMessage, setUserMessage] = useState('');

    // State for paths
    const [paths, setPaths] = useState([]);
    const [loadingPaths, setLoadingPaths] = useState(true);
    const [pathError, setPathError] = useState('');
    const [pathMessage, setPathMessage] = useState('');

    // Fetch users
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

    // Fetch paths
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

    // Fetch data when component mounts
    useEffect(() => {
        fetchUsers();
        fetchPaths();
    }, []);

    // Delete user handler
    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            setUserError('');
            setUserMessage('');
            const res = await API.delete(`/admin/users/${userId}`);
            setUserMessage(res.data.message);
            fetchUsers(); // Refresh the list
        } catch (err) {
             console.error("Error deleting user:", err);
            setUserError(err.response?.data?.message || 'Failed to delete user.');
        }
    };

    // Delete path handler
    const handleDeletePath = async (pathId) => {
        if (!window.confirm('Delete this Learning Path? This affects all users.')) return;
        try {
            setPathError('');
            setPathMessage('');
            const res = await API.delete(`/admin/paths/${pathId}`);
            setPathMessage(res.data.message);
            fetchPaths(); // Refresh the list
        } catch (err) {
             console.error("Error deleting path:", err);
            setPathError(err.response?.data?.message || 'Failed to delete path.');
        }
    };

    // Render loading state
    if (loadingUsers || loadingPaths) {
         return <p>Loading Admin Dashboard...</p>;
    }

    // Render the dashboard content
    return (
        // --- Main container with the class for flexbox layout ---
        <div className="admin-dashboard"> 
            
            {/* --- Wrap header elements in .admin-header --- */}
            <div className="admin-header"> 
                <h1>Admin Dashboard</h1>
                <p>Welcome, Admin {user?.name || user?.email}!</p>
            </div>

            {/* --- Wrap main content sections in .admin-content for scrolling --- */}
            <div className="admin-content"> 

                {/* User Management Section */}
                <section> 
                    <h2>User Management</h2>
                    {userError && <p style={{ color: 'red' }}>Error: {userError}</p>}
                    {userMessage && <p style={{ color: 'green' }}>{userMessage}</p>}
                    {users.length === 0 ? <p>No non-admin users found.</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            {/* Table Head */}
                            <thead>
                                <tr style={{ borderBottom: '1px solid #ccc', backgroundColor: '#f8f8f8' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>ID</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Email</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Role</th>
                                    <th style={{ padding: '8px 12px' }}>Actions</th>
                                </tr>
                            </thead>
                            {/* Table Body */}
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '8px 12px' }}>{u.id}</td>
                                        <td style={{ padding: '8px 12px' }}>{u.name}</td>
                                        <td style={{ padding: '8px 12px' }}>{u.email}</td>
                                        <td style={{ padding: '8px 12px' }}>{u.role}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                style={{ color: 'red', background: 'none', border: '1px solid red', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                {/* Path Management Section */}
                <section> 
                    <h2>Learning Path Management</h2>
                    {pathError && <p style={{ color: 'red' }}>Error: {pathError}</p>}
                    {pathMessage && <p style={{ color: 'green' }}>{pathMessage}</p>}
                    {paths.length === 0 ? <p>No learning paths found.</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                             {/* Table Head */}
                            <thead>
                                <tr style={{ borderBottom: '1px solid #ccc', backgroundColor: '#f8f8f8' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>ID</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Title</th>
                                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Creator Email</th>
                                    <th style={{ padding: '8px 12px' }}>Actions</th>
                                </tr>
                            </thead>
                             {/* Table Body */}
                            <tbody>
                                {paths.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '8px 12px' }}>{p.id}</td>
                                        <td style={{ padding: '8px 12px' }}>{p.title}</td>
                                        <td style={{ padding: '8px 12px' }}>{p.creator_email}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeletePath(p.id)}
                                                 style={{ color: 'red', background: 'none', border: '1px solid red', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                            >
                                                Delete Path
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

            </div> {/* End admin-content */}
        </div> // End admin-dashboard
    );
};

export default AdminDashboard;