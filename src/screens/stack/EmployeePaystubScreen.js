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
  DollarSign,
  FileText,
  Users,
} from "lucide-react-native";
import { useWeeklyReport } from "../../hooks/useApi";
import ErrorRetry from "../../components/ErrorRetry";

const EMERALD = "#10b981";

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
const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n || 0,
  );
const to12h = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function EmployeePaystubScreen({ navigation }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const { data, isLoading, isError, refetch, isRefetching } = useWeeklyReport({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const report = useMemo(() => {
    return data?.data?.salesReport || data?.salesReport || [];
  }, [data]);

  const summary = useMemo(() => {
    return (
      data?.data?.summary ||
      data?.summary || { totalRevenue: 0, totalSales: 0, totalReps: 0 }
    );
  }, [data]);

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <FileText size={18} color={EMERALD} />
        <Text className="text-lg font-semibold text-slate-800 ml-2">
          Weekly Report
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

      {/* Summary */}
      <View className="flex-row px-4 py-3 bg-white border-b border-slate-100 gap-3">
        <View className="flex-1 bg-emerald-50 rounded-xl px-3 py-2">
          <Text className="text-xs text-emerald-600">Revenue</Text>
          <Text className="text-base font-bold text-emerald-700">
            {fmtCurrency(summary.totalRevenue)}
          </Text>
        </View>
        <View className="flex-1 bg-blue-50 rounded-xl px-3 py-2">
          <Text className="text-xs text-blue-600">Sales</Text>
          <Text className="text-base font-bold text-blue-700">
            {summary.totalSales || 0}
          </Text>
        </View>
        <View className="flex-1 bg-slate-100 rounded-xl px-3 py-2">
          <Text className="text-xs text-slate-500">Reps</Text>
          <Text className="text-base font-bold text-slate-700">
            {summary.totalReps || 0}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={EMERALD} />
        </View>
      ) : isError ? (
        <ErrorRetry message="Failed to load weekly report" onRetry={refetch} />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={EMERALD}
            />
          }
        >
          {report.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">📋</Text>
              <Text className="text-base text-slate-400">
                No sales this week
              </Text>
            </View>
          ) : (
            report.map((rep) => (
              <View
                key={rep.salesRepName || rep._id}
                className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Rep header */}
                <View className="px-4 py-3 border-b border-slate-100 flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-emerald-700">
                      {(rep.salesRepName || "?")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-800">
                      {rep.salesRepName}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {rep.salesCount || rep.sales?.length || 0} sales ·{" "}
                      {fmtCurrency(rep.totalAmount)}
                    </Text>
                  </View>
                </View>

                {/* Sales rows */}
                {(rep.sales || []).map((sale, idx) => (
                  <View
                    key={idx}
                    className={`px-4 py-2.5 border-b border-slate-50 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-slate-700">
                        {sale.clientName || sale.name || "—"}
                      </Text>
                      <Text className="text-xs font-bold text-emerald-700">
                        {fmtCurrency(sale.amount || sale.price)}
                      </Text>
                    </View>
                    <View className="flex-row items-center mt-0.5 gap-3">
                      {sale.date && (
                        <Text className="text-[10px] text-slate-400">
                          {new Date(sale.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      )}
                      {(sale.timeslot?.startTime || sale.timeslot?.endTime) && (
                        <Text className="text-[10px] text-slate-400">
                          {to12h(sale.timeslot.startTime)} –{" "}
                          {to12h(sale.timeslot.endTime)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
          <View className="h-6" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
