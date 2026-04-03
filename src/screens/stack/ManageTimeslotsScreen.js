import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  Clock,
  X,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import {
  useWorkdays,
  useCreateWorkday,
  useDeleteWorkday,
  useUpdateWorkday,
} from "../../hooks/useApi";
import ErrorRetry from "../../components/ErrorRetry";

const EMERALD = "#10b981";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfWeek = (d) => {
  const day = d.getDay();
  const diff = d.getDate() - day;
  const s = new Date(d);
  s.setDate(diff);
  s.setHours(0, 0, 0, 0);
  return s;
};
const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const fmtDate = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const to12h = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export default function ManageTimeslotsScreen({ navigation }) {
  const { isOwner, isManager } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const { data: workdays, isLoading, isError, refetch, isRefetching } = useWorkdays({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const createWorkday = useCreateWorkday();
  const deleteWorkday = useDeleteWorkday();
  const updateWorkday = useUpdateWorkday();

  // Create workday modal
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("17:00");
  const [slotMax, setSlotMax] = useState("5");

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));

  // Build week days with workday data
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const iso = date.toISOString().slice(0, 10);
      const raw = Array.isArray(workdays) ? workdays : [];
      const wd = raw.find((w) => (w.date || "").slice(0, 10) === iso);
      days.push({ date, iso, dayName: DAYS[i], workday: wd || null });
    }
    return days;
  }, [weekStart, workdays]);

  const handleCreateWorkday = () => {
    if (!createDate) return;
    const timeslots = [
      {
        startTime: slotStart,
        endTime: slotEnd,
        maxEmployees: parseInt(slotMax) || 5,
      },
    ];
    createWorkday.mutate(
      { date: createDate, timeslots },
      {
        onSuccess: () => {
          setShowCreate(false);
          setSlotStart("09:00");
          setSlotEnd("17:00");
          setSlotMax("5");
        },
      }
    );
  };

  const handleDeleteWorkday = (id) => {
    Alert.alert("Delete Workday", "Remove this entire workday and all timeslots?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteWorkday.mutate(id) },
    ]);
  };

  const handleAddSlot = (wd) => {
    const newSlot = {
      startTime: "09:00",
      endTime: "17:00",
      maxEmployees: 5,
    };
    const existing = wd.timeslots || [];
    updateWorkday.mutate({
      id: wd._id,
      timeslots: [...existing, newSlot],
    });
  };

  if (!isManager && !isOwner) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-base text-slate-500">Manager access required</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-800 flex-1">
          Manage Timeslots
        </Text>
      </View>

      {/* Week nav */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={prevWeek} className="p-1">
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-slate-800">
          {fmtDate(weekStart)} – {fmtDate(weekEnd)}
        </Text>
        <TouchableOpacity onPress={nextWeek} className="p-1">
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={EMERALD} />
        </View>
      ) : isError ? (
        <ErrorRetry message="Failed to load timeslots" onRetry={refetch} />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={EMERALD} />}
        >
          {weekDays.map(({ date, iso, dayName, workday }) => (
            <View key={iso} className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Day header */}
              <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
                <Text className="text-sm font-semibold text-slate-800 flex-1">
                  {dayName}, {fmtDate(date)}
                </Text>
                {workday ? (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-emerald-50 rounded-lg px-2 py-1"
                      onPress={() => handleAddSlot(workday)}
                    >
                      <Plus size={14} color={EMERALD} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-50 rounded-lg px-2 py-1"
                      onPress={() => handleDeleteWorkday(workday._id)}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="bg-emerald-500 rounded-lg px-3 py-1.5"
                    onPress={() => {
                      setCreateDate(iso);
                      setShowCreate(true);
                    }}
                  >
                    <Text className="text-xs text-white font-semibold">+ Workday</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Timeslots */}
              {workday?.timeslots?.length > 0 ? (
                workday.timeslots.map((slot, idx) => (
                  <View key={slot._id || idx} className="px-4 py-3 border-b border-slate-50">
                    <View className="flex-row items-center">
                      <Clock size={14} color="#64748b" />
                      <Text className="text-sm text-slate-700 font-medium ml-2">
                        {to12h(slot.startTime)} – {to12h(slot.endTime)}
                      </Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                      <Users size={12} color="#94a3b8" />
                      <Text className="text-xs text-slate-500 ml-1">
                        {slot.assignedUsers?.length || 0} / {slot.maxEmployees} assigned
                      </Text>
                    </View>
                    {slot.assignedUsers?.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {slot.assignedUsers.map((u) => (
                          <View key={u._id} className="bg-emerald-50 rounded-full px-2 py-0.5">
                            <Text className="text-[10px] text-emerald-700 font-semibold">
                              {u.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              ) : !workday ? (
                <View className="py-4 items-center">
                  <Text className="text-xs text-slate-400">No workday scheduled</Text>
                </View>
              ) : (
                <View className="py-4 items-center">
                  <Text className="text-xs text-slate-400">No timeslots yet</Text>
                </View>
              )}
            </View>
          ))}
          <View className="h-6" />
        </ScrollView>
      )}

      {/* Create Workday Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/30" activeOpacity={1} onPress={() => setShowCreate(false)} />
        <View className="bg-white rounded-t-3xl px-5 py-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-slate-800">Create Workday</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-slate-500 mb-4">
            Date: {createDate}
          </Text>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-600 mb-1">Start Time</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800"
                value={slotStart}
                onChangeText={setSlotStart}
                placeholder="09:00"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-600 mb-1">End Time</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800"
                value={slotEnd}
                onChangeText={setSlotEnd}
                placeholder="17:00"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1">Max Employees</Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800"
              value={slotMax}
              onChangeText={setSlotMax}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <TouchableOpacity
            className="bg-emerald-500 rounded-xl py-3.5 items-center"
            onPress={handleCreateWorkday}
            disabled={createWorkday.isPending}
          >
            {createWorkday.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold">Create</Text>
            )}
          </TouchableOpacity>
          <View className="h-4" />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
