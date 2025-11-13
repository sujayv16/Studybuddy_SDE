import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import './Notifications.css';
import { useNavigate } from 'react-router-dom';

interface NotificationData {
  id: string;
  type: string;
  from: string;
  chatId: string;
  chatTitle?: string;
  body: string;
  timestamp: string;
  targetUser?: string;
}

interface NotificationsProps {
  socket: any;
  currentChatId?: string;
  currentUsername?: string;
}

const Notifications: React.FC<NotificationsProps> = ({ socket, currentChatId, currentUsername }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (socket) {
      // Handle individual targeted notifications
      socket.on('notification', (notification: any) => {
        // Only show notifications for chats other than the current one
        // and if it's targeted to current user or no specific target
        if (notification.chatId !== currentChatId && 
            (!notification.targetUser || notification.targetUser === currentUsername)) {
          const newNotification: NotificationData = {
            id: Date.now().toString() + Math.random().toString(),
            ...notification
          };
          
          setNotifications(prev => [...prev, newNotification]);
          
          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
          }, 5000);
        }
      });

      // Handle group notifications (broadcast to all)
      socket.on('group-notification', (notification: any) => {
        // Only show if current user is in participants and not in current chat
        if (notification.chatId !== currentChatId &&
            notification.participants && 
            notification.participants.includes(currentUsername)) {
          const newNotification: NotificationData = {
            id: Date.now().toString() + Math.random().toString(),
            ...notification
          };
          
          setNotifications(prev => [...prev, newNotification]);
          
          // Auto-remove notification after 6 seconds for group notifications
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
          }, 6000);
        }
      });

      // Handle user join/leave notifications
      socket.on('user-left', (data: any) => {
        const newNotification: NotificationData = {
          id: Date.now().toString() + Math.random().toString(),
          type: 'user-left',
          from: 'System',
          chatId: 'system',
          body: data.message,
          timestamp: new Date().toISOString()
        };
        
        setNotifications(prev => [...prev, newNotification]);
        
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 4000);
      });

      socket.on('users-added', (data: any) => {
        const newNotification: NotificationData = {
          id: Date.now().toString() + Math.random().toString(),
          type: 'users-added',
          from: 'System',
          chatId: 'system',
          body: data.message,
          timestamp: new Date().toISOString()
        };
        
        setNotifications(prev => [...prev, newNotification]);
        
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 4000);
      });

      return () => {
        socket.off('notification');
        socket.off('group-notification');
        socket.off('user-left');
        socket.off('users-added');
      };
    }
  }, [socket, currentChatId, currentUsername]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const openNotification = (notification: NotificationData) => {
    // Navigate to chatroom if chatId present
    if (notification.chatId && notification.chatId !== 'system') {
      // close toasts and navigate
      removeNotification(notification.id);
      navigate(`/chatroom/${notification.chatId}`);
    } else {
      // remove non-navigable notification
      removeNotification(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'added-to-chat':
        return '👥';
      case 'user-left':
        return '👋';
      case 'users-added':
        return '🎉';
      default:
        return '📢';
    }
  };

  const getNotificationTitle = (notification: NotificationData) => {
    switch (notification.type) {
      case 'message':
        return notification.chatTitle ? `${notification.chatTitle}` : 'New Message';
      case 'added-to-chat':
        return 'Added to Chat';
      case 'user-left':
        return 'User Left';
      case 'users-added':
        return 'New Members';
      default:
        return 'Notification';
    }
  };

  return (
    <ToastContainer position="top-end" className="notifications-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          show={true}
          onClose={() => removeNotification(notification.id)}
          delay={notification.type === 'message' ? 5000 : 4000}
          autohide
          className="notification-toast"
        >
          <Toast.Header onClick={() => openNotification(notification)} style={{ cursor: notification.chatId ? 'pointer' : 'default' }}>
            <span className="me-2">{getNotificationIcon(notification.type)}</span>
            <strong className="me-auto">{getNotificationTitle(notification)}</strong>
            <small>{notification.chatTitle ? notification.chatTitle : new Date(notification.timestamp).toLocaleTimeString()}</small>
          </Toast.Header>
          <Toast.Body onClick={() => openNotification(notification)} style={{ cursor: notification.chatId ? 'pointer' : 'default' }}>
            <div style={{ fontSize: '0.95rem' }}>
              <div style={{ marginBottom: 6, color: 'var(--muted)', fontSize: '0.85rem' }}>
                From: {notification.from} {notification.chatTitle ? `• ${notification.chatTitle}` : ''}
              </div>
              <div>
                {notification.body}
              </div>
            </div>
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default Notifications;