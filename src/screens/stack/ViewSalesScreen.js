import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Phone,
  MapPin,
  DollarSign,
  X,
  HelpCircle,
  PhoneForwarded,
  Ban,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useSales, useDeleteSale } from "../../hooks/useApi";
import ErrorRetry from "../../components/ErrorRetry";

// ── Door status config ───────────────────────────────────────────────
const STATUS_CFG = {
  no_answer: { color: "#6c757d", label: "No Answer", symbol: "?" },
  not_interested: { color: "#dc3545", label: "Not Interested", symbol: "✕" },
  callback: { color: "#fd7e14", label: "Callback", symbol: "↻" },
  sale_made: { color: "#2D8A4E", label: "Sale Made", symbol: "$" },
  do_not_knock: { color: "#000000", label: "Do Not Knock", symbol: "⊘" },
};

// ── Helpers ──────────────────────────────────────────────────────────
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
const fmtFull = (d) =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.no_answer;
  return (
    <View
      className="flex-row items-center rounded-full px-2.5 py-1"
      style={{ backgroundColor: cfg.color + "18" }}
    >
      <Text style={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}>
        {cfg.symbol} {cfg.label}
      </Text>
    </View>
  );
}

export default function ViewSalesScreen({ navigation }) {
  const { user, isOwner } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const { data, isLoading, isError, refetch, isRefetching } = useSales({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  });

  const deleteSale = useDeleteSale();

  const sales = useMemo(() => {
    const raw = data?.sales || data?.data?.sales || data || [];
    if (!Array.isArray(raw)) return [];

    const rangeStart = new Date(weekStart);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(weekEnd);
    rangeEnd.setHours(23, 59, 59, 999);

    return raw.filter((sale) => {
      const candidateDate = sale.workday?.date || sale.createdAt;
      if (!candidateDate) return false;

      const saleDate = new Date(candidateDate);
      return (
        !Number.isNaN(saleDate.getTime()) &&
        saleDate >= rangeStart &&
        saleDate <= rangeEnd
      );
    });
  }, [data, weekStart, weekEnd]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      const dateKey =
        s.workday?.date?.slice(0, 10) || s.createdAt?.slice(0, 10) || "unknown";
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  }, [sales]);

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  const handleDelete = useCallback(
    (saleId) => {
      Alert.alert("Delete Record", "Remove this door record?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSale.mutate(saleId),
        },
      ]);
    },
    [deleteSale],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-800 flex-1">
          View Sales
        </Text>
        <Text className="text-xs text-slate-400">{sales.length} records</Text>
      </View>

      {/* Week nav */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity onPress={prevWeek} className="p-1">
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday}>
          <Text className="text-sm font-semibold text-slate-800">
            {fmtDate(weekStart)} – {fmtDate(weekEnd)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextWeek} className="p-1">
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : isError ? (
        <ErrorRetry message="Failed to load sales" onRetry={refetch} />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#10b981"
            />
          }
        >
          {grouped.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">📭</Text>
              <Text className="text-base text-slate-400">
                No records this week
              </Text>
            </View>
          ) : (
            grouped.map(({ date, items }) => (
              <View key={date} className="mt-4">
                {/* Date header */}
                <View className="flex-row items-center px-4 mb-2">
                  <Text className="text-xs font-semibold text-slate-500 uppercase">
                    {fmtFull(new Date(date + "T12:00:00"))}
                  </Text>
                  <View className="bg-slate-200 rounded-full px-2 py-0.5 ml-2">
                    <Text className="text-xs text-slate-600 font-semibold">
                      {items.length}
                    </Text>
                  </View>
                </View>

                {items.map((sale) => (
                  <View
                    key={sale._id}
                    className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm"
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-slate-800">
                          {sale.name || "Unnamed"}
                        </Text>
                        <Text className="text-xs text-slate-400 mt-0.5">
                          {sale.salesRepName || "—"}
                        </Text>
                      </View>
                      <StatusBadge status={sale.doorStatus} />
                    </View>

                    {sale.address ? (
                      <View className="flex-row items-center mt-1">
                        <MapPin size={12} color="#94a3b8" />
                        <Text
                          className="text-xs text-slate-500 ml-1 flex-1"
                          numberOfLines={1}
                        >
                          {sale.address}
                        </Text>
                      </View>
                    ) : null}

                    {sale.number ? (
                      <View className="flex-row items-center mt-1">
                        <Phone size={12} color="#94a3b8" />
                        <Text className="text-xs text-slate-500 ml-1">
                          {sale.number}
                        </Text>
                      </View>
                    ) : null}

                    {sale.doorStatus === "sale_made" && sale.price != null && (
                      <View className="flex-row items-center mt-1">
                        <DollarSign size={12} color="#2D8A4E" />
                        <Text className="text-xs font-semibold text-emerald-700 ml-1">
                          {fmtCurrency(sale.price)}
                        </Text>
                      </View>
                    )}

                    {sale.details ? (
                      <Text
                        className="text-xs text-slate-400 mt-2"
                        numberOfLines={2}
                      >
                        {sale.details}
                      </Text>
                    ) : null}

                    {isOwner && (
                      <TouchableOpacity
                        className="self-end mt-2 p-1"
                        onPress={() => handleDelete(sale._id)}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    )}
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
