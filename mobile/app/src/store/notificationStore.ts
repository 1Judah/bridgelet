import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'New message received',
    body: 'You have a new message from Alex.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    title: 'Your order has shipped',
    body: 'Order #4821 is on its way.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '3',
    title: 'Payment confirmed',
    body: 'Your payment of $49.99 was successful.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '4',
    title: 'Reminder: Meeting at 3pm',
    body: "Don't forget your scheduled call.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
];

const countUnread = (notifications: Notification[]) =>
  notifications.filter((n) => !n.read).length;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: countUnread(MOCK_NOTIFICATIONS),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications: updated, unreadCount: countUnread(updated) };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));