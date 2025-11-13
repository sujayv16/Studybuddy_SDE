import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Badge } from 'react-bootstrap';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  username: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ username }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const navigate = useNavigate();

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

  const openNotification = (notification: any) => {
    if (notification.chatId && notification.chatId !== 'system') {
      setNotifications([]);
      navigate(`/chatroom/${notification.chatId}`);
    }
  };
  const unreadCount = notifications.length;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-secondary" id="notification-dropdown" className="notification-toggle" style={{ position: 'relative' }}>
        <span aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            pill 
            className="notification-badge"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-menu" style={{ minWidth: '300px', maxHeight: '60vh', overflowY: 'auto' }}>
        <Dropdown.Header className="d-flex justify-content-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={clearNotifications} className="p-0">
              Clear All
            </Button>
          )}
        </Dropdown.Header>
        
        {notifications.length === 0 ? (
          <Dropdown.ItemText className="px-3 py-3 text-muted">No new notifications</Dropdown.ItemText>
        ) : (
          notifications.map((notification, index) => (
            <Dropdown.Item key={index} className="notification-item" onClick={() => openNotification(notification)}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block">
                    {notification.type === 'message' ? '💬' : '📢'} {notification.from}
                  </small>
                  <div className="notification-body" style={{ fontSize: '0.95rem' }}>
                    {notification.chatTitle ? (<strong>{notification.chatTitle}</strong>) : null}
                    <div>{notification.body}</div>
                  </div>
                </div>
                <small className="text-muted ms-3 d-none d-sm-block" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </small>
              </div>
            </Dropdown.Item>
          ))
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;