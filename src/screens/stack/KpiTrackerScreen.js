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
import { ArrowLeft, TrendingUp } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useKpiTracker } from "../../hooks/useApi";
import ErrorRetry from "../../components/ErrorRetry";

const SORT_OPTIONS = [
  { key: "totalDoors", label: "Doors", color: "#64748b" },
  { key: "sale_made", label: "Sales", color: "#2D8A4E" },
  { key: "no_answer", label: "No Answer", color: "#6c757d" },
  { key: "not_interested", label: "Not Int.", color: "#dc3545" },
];

const CARD_STATS = [
  { key: "sale_made", label: "Sales", color: "#2D8A4E" },
  { key: "no_answer", label: "N/A", color: "#6c757d" },
  { key: "not_interested", label: "N/I", color: "#dc3545" },
];

const RANK_CONFIG = {
  1: { bg: "#fef3c7", text: "#d97706", label: "1st" },
  2: { bg: "#f1f5f9", text: "#64748b", label: "2nd" },
  3: { bg: "#fff7ed", text: "#ea580c", label: "3rd" },
};

function RankBadge({ rank }) {
  const cfg = RANK_CONFIG[rank] || { bg: "#f8fafc", text: "#94a3b8", label: `${rank}` };
  return (
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
}

function Avatar({ name }) {
  const initials = name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#059669" }}>{initials}</Text>
    </View>
  );
}

export default function KpiTrackerScreen({ navigation }) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState("totalDoors");
  const { data, isLoading, isError, refetch, isRefetching } = useKpiTracker();

  const entries = useMemo(() => {
    const raw = data?.kpiData || data?.data?.kpiData || data || [];
    const arr = Array.isArray(raw) ? [...raw] : [];
    arr.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    return arr;
  }, [data, sortBy]);

  const totals = useMemo(() => {
    const t = { totalDoors: 0, sale_made: 0, no_answer: 0, not_interested: 0 };
    entries.forEach((e) => {
      t.totalDoors += e.totalDoors || 0;
      t.sale_made += e.sale_made || 0;
      t.no_answer += e.no_answer || 0;
      t.not_interested += e.not_interested || 0;
    });
    return t;
  }, [entries]);

  const activeSortColor = SORT_OPTIONS.find((s) => s.key === sortBy)?.color || "#64748b";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 2 }}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <TrendingUp size={18} color="#10b981" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#0f172a", flex: 1 }}>KPI Tracker</Text>
        <View style={{ backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#059669" }}>{entries.length} members</Text>
        </View>
      </View>

      {/* Team Totals */}
      <View style={{ backgroundColor: "#fff", flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
        {SORT_OPTIONS.map(({ key, label, color }) => (
          <View key={key} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color }}>{totals[key]}</Text>
            <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "500", marginTop: 2 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Sort tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {SORT_OPTIONS.map(({ key, label, color }) => {
          const active = sortBy === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSortBy(key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: active ? color : "#f1f5f9",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : "#64748b" }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : isError ? (
        <ErrorRetry message="Failed to load KPI data" onRetry={refetch} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#10b981" />}
        >
          {entries.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📈</Text>
              <Text style={{ fontSize: 15, color: "#94a3b8" }}>No KPI data yet</Text>
            </View>
          ) : (
            entries.map((entry, idx) => {
              const isMe = entry._id === (user?._id || user?.id);
              return (
                <View
                  key={entry._id}
                  style={{
                    backgroundColor: isMe ? "#f0fdf4" : "#fff",
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isMe ? "#a7f3d0" : "#f1f5f9",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  {/* Top row: rank + avatar + name + active metric */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <RankBadge rank={idx + 1} />
                    <View style={{ width: 10 }} />
                    <Avatar name={entry.name} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }} numberOfLines={1}>{entry.name}</Text>
                        {isMe && (
                          <View style={{ backgroundColor: "#10b981", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{entry.totalDoors || 0} doors knocked</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 20, fontWeight: "700", color: activeSortColor }}>{entry[sortBy] || 0}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>{SORT_OPTIONS.find((s) => s.key === sortBy)?.label}</Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={{ flexDirection: "row", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isMe ? "#bbf7d0" : "#f1f5f9" }}>
                    {CARD_STATS.map(({ key, label, color }) => (
                      <View key={key} style={{ flex: 1, alignItems: "center" }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color }}>{entry[key] || 0}</Text>
                        <Text style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
