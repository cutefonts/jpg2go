import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotificationContextType {
  notify: (message: string, type?: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context.notify;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);
  let timeoutId: NodeJS.Timeout;

  const notify = useCallback((message: string, type: Notification['type'] = 'info') => {
    setNotification({ message, type });
    setVisible(true);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      setVisible(false);
    }, 3000);
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {notification && visible && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg shadow-lg text-white text-base font-medium transition-all duration-300
            ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
          style={{ minWidth: 240, maxWidth: '90vw' }}
        >
          <div className="flex items-center justify-between gap-4">
            <span>{notification.message}</span>
            <button onClick={handleClose} className="ml-4 text-white/80 hover:text-white text-lg font-bold">&times;</button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}; 