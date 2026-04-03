import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle,
} from "lucide-react-native";
import { useWorkdays } from "../../hooks/useApi";
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
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function ViewTimeslotsScreen({ navigation }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const { data: workdays, isLoading, isError, refetch, isRefetching } = useWorkdays({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));

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

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-800">My Timeslots</Text>
      </View>

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
          {weekDays.map(({ date, iso, dayName, workday }) => {
            const slots = workday?.timeslots || [];
            return (
              <View key={iso} className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
                <View className="px-4 py-3 border-b border-slate-100 flex-row items-center">
                  <Text className="text-sm font-semibold text-slate-800 flex-1">
                    {dayName}, {fmtDate(date)}
                  </Text>
                  {slots.length > 0 && (
                    <View className="bg-emerald-50 rounded-full px-2 py-0.5">
                      <Text className="text-[10px] text-emerald-700 font-semibold">
                        {slots.length} slot{slots.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>

                {slots.length === 0 ? (
                  <View className="py-4 items-center">
                    <Text className="text-xs text-slate-400">No shifts</Text>
                  </View>
                ) : (
                  slots.map((slot, idx) => {
                    const assigned = slot.assignedUsers?.length || 0;
                    const max = slot.maxEmployees || 1;
                    const recorded = slot.sales?.length || 0;
                    const pct = Math.min(100, (recorded / Math.max(1, assigned)) * 100);

                    return (
                      <View key={slot._id || idx} className="px-4 py-3 border-b border-slate-50">
                        <View className="flex-row items-center mb-2">
                          <Clock size={14} color="#64748b" />
                          <Text className="text-sm font-medium text-slate-700 ml-2">
                            {to12h(slot.startTime)} – {to12h(slot.endTime)}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-4">
                          <View className="flex-row items-center">
                            <Users size={12} color="#94a3b8" />
                            <Text className="text-xs text-slate-500 ml-1">
                              {assigned}/{max} people
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <CheckCircle size={12} color={EMERALD} />
                            <Text className="text-xs text-slate-500 ml-1">
                              {recorded} recorded
                            </Text>
                          </View>
                        </View>
                        {/* Progress bar */}
                        <View className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}
          <View className="h-6" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
