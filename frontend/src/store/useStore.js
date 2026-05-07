import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Auth - all in memory, never localStorage
  user: null,
  isAuthenticated: false,

  // Chat
  messages: [],
  showCrisisAlert: false,

  // Mood
  moodLogs: [],

  // Forum
  forumPosts: [],

  // Conversations (patient-counselor)
  conversations: [],

  // Actions
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearUser: () => set({
    user: null,
    isAuthenticated: false,
    messages: [],
    moodLogs: [],
    forumPosts: [],
    conversations: [],
    showCrisisAlert: false
  }),

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg]
  })),
  setMessages: (messages) => set({ messages }),
  setShowCrisisAlert: (show) => set({ showCrisisAlert: show }),

  setMoodLogs: (moodLogs) => set({ moodLogs }),
  addMoodLog: (log) => set((state) => ({
    moodLogs: [...state.moodLogs, log]
  })),

  setForumPosts: (forumPosts) => set({ forumPosts }),
  setConversations: (conversations) => set({ conversations }),
}));

export default useStore;
