import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  workdayAPI,
  salesAPI,
  timeslotAPI,
  organizationAPI,
} from "../services/api";
import Toast from "react-native-toast-message";

export const queryKeys = {
  workdays: (params) => ["workdays", params],
  sales: (params) => ["sales", params],
  timeslots: (params) => ["timeslots", params],
  organization: ["organization"],
  leaderboard: ["leaderboard"],
  kpiTracker: ["kpiTracker"],
  weeklyReport: (params) => ["weeklyReport", params],
  geojson: ["geojson"],
};

// ─── Workday Hooks ───────────────────────────────────────────────────
export const useWorkdays = (params = {}) =>
  useQuery({
    queryKey: queryKeys.workdays(params),
    queryFn: () =>
      workdayAPI.getAll(params).then((res) => {
        if (res.data.data?.workdays) return res.data.data.workdays;
        return res.data.workdays || res.data;
      }),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

export const useCreateWorkday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => workdayAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workdays"] }),
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to create workday",
      }),
  });
};

export const useUpdateWorkday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }) => workdayAPI.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workdays"] }),
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to update workday",
      }),
  });
};

export const useDeleteWorkday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => workdayAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workdays"] }),
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to delete workday",
      }),
  });
};

// ─── Sales Hooks ─────────────────────────────────────────────────────
export const useSales = (params = {}) =>
  useQuery({
    queryKey: queryKeys.sales(params),
    queryFn: () => salesAPI.getAll(params).then((res) => res.data),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
    retry: 2,
  });

export const useCreateSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => salesAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["workdays"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["kpiTracker"] });
      qc.invalidateQueries({ queryKey: ["geojson"] });
    },
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to record door",
      }),
  });
};

export const useDeleteSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (saleId) => salesAPI.delete(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["workdays"] });
    },
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to delete sale",
      }),
  });
};

export const useLeaderboard = () =>
  useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: () => salesAPI.getLeaderboard().then((res) => res.data),
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

export const useKpiTracker = () =>
  useQuery({
    queryKey: queryKeys.kpiTracker,
    queryFn: () => salesAPI.getKpiTracker().then((res) => res.data),
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

export const useWeeklyReport = (params = {}) =>
  useQuery({
    queryKey: queryKeys.weeklyReport(params),
    queryFn: () => salesAPI.getWeeklyReport(params).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

export const useGeoJSON = () =>
  useQuery({
    queryKey: queryKeys.geojson,
    queryFn: () => salesAPI.getGeoJSON().then((res) => res.data),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
    retry: 2,
  });

// ─── Timeslot Hooks ──────────────────────────────────────────────────
export const useTimeslots = (params = {}) =>
  useQuery({
    queryKey: queryKeys.timeslots(params),
    queryFn: () => timeslotAPI.getAll(params).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

export const useAssignTimeslot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => timeslotAPI.assign(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeslots"] });
      qc.invalidateQueries({ queryKey: ["workdays"] });
    },
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to assign timeslot",
      }),
  });
};

// ─── Organization Hooks ──────────────────────────────────────────────
export const useOrganization = () =>
  useQuery({
    queryKey: queryKeys.organization,
    queryFn: () => organizationAPI.getDetails().then((res) => res.data),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

export const useJoinOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code) => organizationAPI.join(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization"] }),
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to join organization",
      }),
  });
};

export const useCreateOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => organizationAPI.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization"] }),
    onError: (err) =>
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.response?.data?.msg || "Failed to create organization",
      }),
  });
};
