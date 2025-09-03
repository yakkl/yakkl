import { writable } from 'svelte/store';

interface UIState {
  modals: {
    send: boolean;
    receive: boolean;
    swap: boolean;
    buy: boolean;
    aiHelp: boolean;
    settings: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  loading: {
    global: boolean;
    message?: string;
  };
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // Auto-dismiss time in ms
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

function createUIStore() {
  const { subscribe, set, update } = writable<UIState>({
    modals: {
      send: false,
      receive: false,
      swap: false,
      buy: false,
      aiHelp: false,
      settings: false
    },
    theme: 'auto',
    sidebarCollapsed: false,
    notifications: [],
    loading: {
      global: false
    }
  });

  return {
    subscribe,
    
    // Modal management
    openModal(modal: keyof UIState['modals']) {
      update(state => ({
        ...state,
        modals: {
          ...state.modals,
          [modal]: true
        }
      }));
    },

    closeModal(modal: keyof UIState['modals']) {
      update(state => ({
        ...state,
        modals: {
          ...state.modals,
          [modal]: false
        }
      }));
    },

    closeAllModals() {
      update(state => ({
        ...state,
        modals: {
          send: false,
          receive: false,
          swap: false,
          buy: false,
          aiHelp: false,
          settings: false
        }
      }));
    },

    // Theme management
    setTheme(theme: 'light' | 'dark' | 'auto') {
      update(state => ({
        ...state,
        theme
      }));
      
      // Apply theme to document
      this.applyTheme(theme);
    },

    applyTheme(theme: 'light' | 'dark' | 'auto') {
      // Check if we're in a browser environment
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return;
      }
      
      const root = document.documentElement;
      
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    },

    // Notification management
    addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: Date.now()
      };

      update(state => ({
        ...state,
        notifications: [...state.notifications, newNotification]
      }));

      // Auto-dismiss if duration is set
      if (notification.duration) {
        setTimeout(() => {
          this.removeNotification(id);
        }, notification.duration);
      }

      return id;
    },

    removeNotification(id: string) {
      update(state => ({
        ...state,
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    },

    clearAllNotifications() {
      update(state => ({
        ...state,
        notifications: []
      }));
    },

    // Loading management
    setGlobalLoading(loading: boolean, message?: string) {
      update(state => ({
        ...state,
        loading: {
          global: loading,
          message
        }
      }));
    },

    // Sidebar management
    toggleSidebar() {
      update(state => ({
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed
      }));
    },

    setSidebarCollapsed(collapsed: boolean) {
      update(state => ({
        ...state,
        sidebarCollapsed: collapsed
      }));
    },

    // Success/Error helpers
    showSuccess(title: string, message: string, duration: number = 5000) {
      return this.addNotification({
        type: 'success',
        title,
        message,
        duration
      });
    },

    showError(title: string, message: string, duration?: number) {
      return this.addNotification({
        type: 'error',
        title,
        message,
        duration // No auto-dismiss for errors by default
      });
    },

    showWarning(title: string, message: string, duration: number = 8000) {
      return this.addNotification({
        type: 'warning',
        title,
        message,
        duration
      });
    },

    showInfo(title: string, message: string, duration: number = 6000) {
      return this.addNotification({
        type: 'info',
        title,
        message,
        duration
      });
    },

    // Transaction feedback helpers
    showTransactionPending(txHash: string) {
      return this.addNotification({
        type: 'info',
        title: 'Transaction Sent',
        message: `Transaction pending: ${txHash.slice(0, 10)}...`,
        actions: [
          {
            label: 'View on Explorer',
            action: () => {
              // Open block explorer
              if (typeof window !== 'undefined') {
                window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
              }
            }
          }
        ]
      });
    },

    showTransactionSuccess(txHash: string) {
      return this.addNotification({
        type: 'success',
        title: 'Transaction Confirmed',
        message: `Transaction successful: ${txHash.slice(0, 10)}...`,
        duration: 8000,
        actions: [
          {
            label: 'View on Explorer',
            action: () => {
              if (typeof window !== 'undefined') {
                window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
              }
            }
          }
        ]
      });
    },

    showTransactionFailed(txHash: string) {
      return this.addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: `Transaction failed: ${txHash.slice(0, 10)}...`,
        actions: [
          {
            label: 'View on Explorer',
            action: () => {
              if (typeof window !== 'undefined') {
                window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
              }
            }
          }
        ]
      });
    }
  };
}

export const uiStore = createUIStore();

// Derived stores for specific UI elements
export const modals = {
  send: { subscribe: (callback: (value: boolean) => void) => uiStore.subscribe(state => callback(state.modals.send)) },
  receive: { subscribe: (callback: (value: boolean) => void) => uiStore.subscribe(state => callback(state.modals.receive)) },
  swap: { subscribe: (callback: (value: boolean) => void) => uiStore.subscribe(state => callback(state.modals.swap)) },
  buy: { subscribe: (callback: (value: boolean) => void) => uiStore.subscribe(state => callback(state.modals.buy)) },
  aiHelp: { subscribe: (callback: (value: boolean) => void) => uiStore.subscribe(state => callback(state.modals.aiHelp)) },
  settings: { subscribe: (callback: (value: boolean) => void) => uiStore.subscribe(state => callback(state.modals.settings)) }
};