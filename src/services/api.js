import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";

const API_BASE_URL = "https://turtle-sales-3def4d2204ba.herokuapp.com/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — inject Bearer token from SecureStore
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error reading auth token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — unified error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === "ECONNABORTED") {
      Toast.show({
        type: "error",
        text1: "Timeout",
        text2: "Request timed out. Please check your connection.",
      });
    } else if (!error.response) {
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Unable to connect to server.",
      });
    } else {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          await SecureStore.deleteItemAsync("auth_token");
          // Navigation to login is handled by AuthContext listener
          break;
        case 403:
          Toast.show({
            type: "error",
            text1: "Access Denied",
            text2: "You don't have permission for this action.",
          });
          break;
        case 404:
          Toast.show({
            type: "error",
            text1: "Not Found",
            text2: "Requested resource not found.",
          });
          break;
        case 429:
          Toast.show({
            type: "error",
            text1: "Rate Limited",
            text2: "Too many requests. Please try again shortly.",
          });
          break;
        case 500:
          Toast.show({
            type: "error",
            text1: "Server Error",
            text2: "Something went wrong. Please try again later.",
          });
          break;
        default:
          Toast.show({
            type: "error",
            text1: "Error",
            text2:
              data?.msg || data?.message || "An unexpected error occurred.",
          });
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth API ────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  dashboard: () => api.get("/auth/dashboard"),
  updateProfile: (data) => api.put("/auth/update-profile", data),
  completeFirstLogin: (data) => api.put("/auth/first-login", data),
  uploadProfilePicture: (formData) =>
    api.post("/auth/upload-profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  removeProfilePicture: () => api.delete("/auth/remove-profile-picture"),
  deleteAccount: () => api.delete("/auth/delete-account"),
};

// ─── Organization API ────────────────────────────────────────────────
export const organizationAPI = {
  create: (orgData) => api.post("/organization/create", orgData),
  join: (code) => api.post("/organization/join", { code }),
  getDetails: () => api.get("/organization"),
  updateDetails: (updates) => api.put("/organization", updates),
  deleteOrganization: () => api.delete("/organization"),
  removeMember: (memberId) => api.delete(`/organization/member/${memberId}`),
  leaveOrganization: () => api.post("/organization/leave"),
  promoteMember: (memberId) =>
    api.put(`/organization/member/promote/${memberId}`),
};

// ─── Sales API ───────────────────────────────────────────────────────
export const salesAPI = {
  getAll: (params) => api.get("/sales", { params }),
  create: (sale) => api.post("/sales", sale),
  delete: (saleId) => api.delete(`/sales/${saleId}`),
  getGeoJSON: () => api.get("/sales/geojson"),
  getLeaderboard: () => api.get("/sales/leaderboard"),
  getKpiTracker: () => api.get("/sales/kpi-tracker"),
  getWeeklyReport: (params) => api.get("/sales/weekly-report", { params }),
};

// ─── Workday API ─────────────────────────────────────────────────────
export const workdayAPI = {
  getAll: (params) => api.get("/workdays", { params }),
  create: (workday) => api.post("/workdays", workday),
  update: (id, updates) => api.put(`/workdays/${id}`, updates),
  delete: (id) => api.delete(`/workdays/${id}`),
  assignTimeslot: (workdayId, timeslotId, data) =>
    api.put(`/workdays/${workdayId}/timeslots/${timeslotId}/assign`, data),
  deleteTimeslot: (workdayId, timeslotId) =>
    api.delete(`/workdays/${workdayId}/timeslots/${timeslotId}`),
};

// ─── Timeslot API ────────────────────────────────────────────────────
export const timeslotAPI = {
  generate: (data) => api.post("/timeslots/generate", data),
  getAll: (params) => api.get("/timeslots", { params }),
  assign: (timeslotId, data) =>
    api.put(`/timeslots/assign/${timeslotId}`, data),
  delete: (timeslotId) => api.delete(`/timeslots/${timeslotId}`),
};

// ─── Chat API ────────────────────────────────────────────────────────
export const chatAPI = {
  getGroupHistory: () => api.get("/chat/history/group"),
  getPrivateHistory: (userId) => api.get(`/chat/history/private/${userId}`),
  getMembers: () => api.get("/chat/members"),
};

export default api;
