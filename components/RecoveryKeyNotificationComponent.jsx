import React, { useState, useEffect } from 'react';

const RecoveryKeyNotificationComponent = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadNotifications();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/notifications/admin', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Filter for recovery key reset requests
                    const recoveryKeyNotifications = data.data.notifications.filter(notification => 
                        notification.category === 'system' && 
                        notification.data && 
                        notification.data.actionType === 'recovery_key_reset_request'
                    );
                    setNotifications(recoveryKeyNotifications);
                }
            } else {
                setError('Failed to load notifications');
            }
        } catch (err) {
            setError('Error loading notifications');
            console.error('Error loading notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/admin/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (response.ok) {
                // Reload notifications
                loadNotifications();
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const openRecoveryKeyRequests = () => {
        window.open('/admin-recovery-key-requests.html', '_blank');
    };

    if (loading) {
        return (
            <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                margin: '20px 0'
            }}>
                <div>Loading notifications...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                margin: '20px 0',
                color: '#721c24'
            }}>
                <div>Error: {error}</div>
                <button 
                    onClick={loadNotifications}
                    style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ 
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            margin: '20px 0',
            overflow: 'hidden'
        }}>
            <div style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '15px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    🔔 Recovery Key Reset Requests
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        backgroundColor: notifications.length > 0 ? '#ef4444' : '#6b7280',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        {notifications.length}
                    </span>
                    <button 
                        onClick={loadNotifications}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                    <div style={{ 
                        padding: '40px 20px', 
                        textAlign: 'center', 
                        color: '#6b7280' 
                    }}>
                        <p>No pending recovery key reset requests</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div 
                            key={notification._id}
                            style={{
                                padding: '15px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                backgroundColor: notification.read ? '#ffffff' : '#fef3c7',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: '#1f2937', 
                                        marginBottom: '4px',
                                        fontSize: '14px'
                                    }}>
                                        {notification.title}
                                    </div>
                                    <div style={{ 
                                        color: '#6b7280', 
                                        fontSize: '13px', 
                                        marginBottom: '4px' 
                                    }}>
                                        {notification.message}
                                    </div>
                                    <div style={{ 
                                        color: '#9ca3af', 
                                        fontSize: '12px' 
                                    }}>
                                        {getTimeAgo(notification.createdAt)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                                    <button 
                                        onClick={() => markAsRead(notification._id)}
                                        style={{
                                            padding: '4px 8px',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            backgroundColor: notification.read ? '#e5e7eb' : '#3b82f6',
                                            color: notification.read ? '#374151' : 'white'
                                        }}
                                    >
                                        {notification.read ? 'Read' : 'Mark Read'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div style={{
                    padding: '15px 20px',
                    backgroundColor: '#e5e7eb',
                    textAlign: 'center'
                }}>
                    <button 
                        onClick={openRecoveryKeyRequests}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        🔐 Manage All Requests
                    </button>
                </div>
            )}
        </div>
    );
};

export default RecoveryKeyNotificationComponent;

