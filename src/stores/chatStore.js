import { create } from "zustand";
import { io } from "socket.io-client";
import { chatAPI } from "../services/api";

const SOCKET_URL = "https://turtle-sales-3def4d2204ba.herokuapp.com";

const useChatStore = create((set, get) => ({
  // ── state ──────────────────────────────────────────────────────────
  socket: null,
  connected: false,
  members: [],
  groupMessages: [],
  pmMessages: {},
  activeTabs: [],
  activeTab: "org",
  typingUsers: {},
  myStatus: "online",
  unreadPms: {},
  rateLimited: false,
  _myUserId: null,

  // ── connect / disconnect ───────────────────────────────────────────
  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));

    socket.on("receiveMessage", (msg) => {
      const state = get();
      if (msg.type === "group") {
        set({ groupMessages: [...state.groupMessages, msg] });
      } else if (msg.type === "private") {
        const myId = state._myUserId;
        const odUserId = msg.sender === myId ? msg.receiver : msg.sender;
        const existing = state.pmMessages[odUserId] || [];
        set({
          pmMessages: { ...state.pmMessages, [odUserId]: [...existing, msg] },
        });
        if (msg.sender !== myId && state.activeTab !== odUserId) {
          const prev = state.unreadPms[odUserId] || 0;
          set({ unreadPms: { ...state.unreadPms, [odUserId]: prev + 1 } });
        }
        const tabExists = state.activeTabs.some((t) => t.userId === odUserId);
        if (!tabExists) {
          const member = state.members.find((m) => m._id === odUserId);
          set({
            activeTabs: [
              ...state.activeTabs,
              { id: odUserId, name: member?.name || msg.senderName || "User", userId: odUserId },
            ],
          });
        }
      }
    });

    socket.on("userStatusChanged", ({ userId, status }) => {
      set({
        members: get().members.map((m) =>
          m._id === userId ? { ...m, activityStatus: status } : m
        ),
      });
    });

    socket.on("userTyping", ({ userId, userName, type }) => {
      if (type === "group") {
        const prev = get().typingUsers.group || [];
        if (!prev.includes(userName)) {
          set({ typingUsers: { ...get().typingUsers, group: [...prev, userName] } });
        }
      } else {
        set({ typingUsers: { ...get().typingUsers, [userId]: userName } });
      }
    });

    socket.on("userStopTyping", ({ userId, type }) => {
      if (type === "group") {
        const state = get();
        const member = state.members.find((m) => m._id === userId);
        const prev = state.typingUsers.group || [];
        set({
          typingUsers: {
            ...state.typingUsers,
            group: prev.filter((n) => n !== member?.name),
          },
        });
      } else {
        const { [userId]: _, ...rest } = get().typingUsers;
        set({ typingUsers: rest });
      }
    });

    socket.on("rateLimited", () => {
      set({ rateLimited: true });
      setTimeout(() => set({ rateLimited: false }), 3000);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        connected: false,
        groupMessages: [],
        pmMessages: {},
        activeTabs: [],
        activeTab: "org",
        members: [],
        typingUsers: {},
      });
    }
  },

  setMyUserId: (id) => set({ _myUserId: id }),

  // ── REST fetches ───────────────────────────────────────────────────
  fetchMembers: async () => {
    try {
      const res = await chatAPI.getMembers();
      if (res.data.success) set({ members: res.data.members });
    } catch (e) {
      console.error("fetchMembers:", e);
    }
  },

  fetchGroupHistory: async () => {
    try {
      const res = await chatAPI.getGroupHistory();
      if (res.data.success) set({ groupMessages: res.data.messages });
    } catch (e) {
      console.error("fetchGroupHistory:", e);
    }
  },

  fetchPmHistory: async (userId) => {
    try {
      const res = await chatAPI.getPrivateHistory(userId);
      if (res.data.success) {
        set({ pmMessages: { ...get().pmMessages, [userId]: res.data.messages } });
      }
    } catch (e) {
      console.error("fetchPmHistory:", e);
    }
  },

  // ── actions ────────────────────────────────────────────────────────
  sendMessage: (content, type, receiverId) => {
    const { socket } = get();
    if (!socket) return;
    socket.emit("sendMessage", { content, type, receiverId });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (tab !== "org") {
      const { [tab]: _, ...rest } = get().unreadPms;
      set({ unreadPms: rest });
    }
  },

  openPmTab: (member) => {
    const state = get();
    const exists = state.activeTabs.some((t) => t.userId === member._id);
    if (!exists) {
      set({
        activeTabs: [
          ...state.activeTabs,
          { id: member._id, name: member.name, userId: member._id },
        ],
      });
    }
    set({ activeTab: member._id });
    const { [member._id]: _, ...restUnread } = get().unreadPms;
    set({ unreadPms: restUnread });
    if (!state.pmMessages[member._id]) {
      get().fetchPmHistory(member._id);
    }
  },

  closePmTab: (userId) => {
    const state = get();
    set({
      activeTabs: state.activeTabs.filter((t) => t.userId !== userId),
      activeTab: state.activeTab === userId ? "org" : state.activeTab,
    });
  },

  setMyStatus: (status) => {
    const { socket } = get();
    if (socket) socket.emit("setStatus", status);
    set({ myStatus: status });
  },

  clearUnreadPms: () => set({ unreadPms: {} }),

  emitTyping: (type, receiverId) => {
    const { socket } = get();
    if (socket) socket.emit("typing", { type, receiverId });
  },

  emitStopTyping: (type, receiverId) => {
    const { socket } = get();
    if (socket) socket.emit("stopTyping", { type, receiverId });
  },
}));

export default useChatStore;
