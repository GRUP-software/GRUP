import React from 'react';
import RecoveryKeyNotificationComponent from './RecoveryKeyNotificationComponent.jsx';

const AdminDashboardComponent = (props) => {
    return (
        <div>
            {/* Recovery Key Notifications */}
            <RecoveryKeyNotificationComponent />
            
            {/* Default AdminJS Dashboard Content */}
            <div style={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                margin: '20px 0',
                padding: '20px'
            }}>
                <h2 style={{ 
                    margin: '0 0 20px 0', 
                    color: '#1f2937',
                    fontSize: '24px',
                    fontWeight: '600'
                }}>
                    📊 Admin Dashboard
                </h2>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>👥 Users</h3>
                        <p style={{ margin: '0', color: '#6b7280' }}>Manage user accounts and profiles</p>
                    </div>
                    
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>📦 Products</h3>
                        <p style={{ margin: '0', color: '#6b7280' }}>Manage product catalog and inventory</p>
                    </div>
                    
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>🛒 Orders</h3>
                        <p style={{ margin: '0', color: '#6b7280' }}>Track and manage customer orders</p>
                    </div>
                    
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>💰 Wallets</h3>
                        <p style={{ margin: '0', color: '#6b7280' }}>Monitor user wallet balances</p>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>🔔 Important</h4>
                    <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
                        Check the recovery key reset notifications above for any pending user requests that need your attention.
                    </p>
                </div>

                <div style={{
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    padding: '15px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#065f46' }}>💡 Quick Actions</h4>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                            onClick={() => window.open('/admin-recovery-key-requests.html', '_blank')}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            🔐 Recovery Key Requests
                        </button>
                        <button 
                            onClick={() => window.open('/admin-upload.html', '_blank')}
                            style={{
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            📤 Image Upload
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardComponent;

