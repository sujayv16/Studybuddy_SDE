import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Badge } from 'react-bootstrap';
import io from 'socket.io-client';

interface NotificationBellProps {
  username: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ username }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io('/chat');
    setSocket(newSocket);

    // Listen for notifications
    newSocket.on('notification', (notification: any) => {
      if (!notification.targetUser || notification.targetUser === username) {
        setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep only last 10
      }
    });

    newSocket.on('group-notification', (notification: any) => {
      if (notification.participants && notification.participants.includes(username)) {
        setNotifications(prev => [notification, ...prev].slice(0, 10));
      }
    });

    return () => {
      newSocket.close();
    };
  }, [username]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.length;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-light" id="notification-dropdown" style={{ position: 'relative' }}>
        🔔
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            pill 
            style={{ 
              position: 'absolute', 
              top: '-5px', 
              right: '-5px',
              fontSize: '0.75rem'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
        <Dropdown.Header className="d-flex justify-content-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={clearNotifications} className="p-0">
              Clear All
            </Button>
          )}
        </Dropdown.Header>
        
        {notifications.length === 0 ? (
          <Dropdown.ItemText>No new notifications</Dropdown.ItemText>
        ) : (
          notifications.map((notification, index) => (
            <Dropdown.Item key={index} className="border-bottom">
              <div className="d-flex justify-content-between">
                <small className="text-muted">
                  {notification.type === 'message' ? '💬' : '📢'} {notification.from}
                </small>
                <small className="text-muted">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </small>
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                {notification.body}
              </div>
            </Dropdown.Item>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;