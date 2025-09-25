import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import './Notifications.css';

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
          <Toast.Header>
            <span className="me-2">{getNotificationIcon(notification.type)}</span>
            <strong className="me-auto">{getNotificationTitle(notification)}</strong>
            <small>{new Date(notification.timestamp).toLocaleTimeString()}</small>
          </Toast.Header>
          <Toast.Body>
            {notification.type === 'message' && (
              <div>
                <strong>{notification.from}:</strong> {notification.body}
              </div>
            )}
            {notification.type !== 'message' && (
              <div>{notification.body}</div>
            )}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default Notifications;