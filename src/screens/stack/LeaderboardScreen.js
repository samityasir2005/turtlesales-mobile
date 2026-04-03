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
import { ArrowLeft, Star, Target, Circle, Trophy } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useLeaderboard } from "../../hooks/useApi";
import ErrorRetry from "../../components/ErrorRetry";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n || 0
  );

function RankIcon({ rank }) {
  if (rank === 1)
    return (
      <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
        <Star size={16} color="#f59e0b" fill="#f59e0b" />
      </View>
    );
  if (rank === 2)
    return (
      <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
        <Circle size={16} color="#94a3b8" />
      </View>
    );
  if (rank === 3)
    return (
      <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
        <Target size={16} color="#f97316" />
      </View>
    );
  return (
    <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
      <Text className="text-xs font-bold text-slate-500">{rank}</Text>
    </View>
  );
}

function MemberAvatar({ name }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
      <Text className="text-sm font-bold text-emerald-700">{initials}</Text>
    </View>
  );
}

export default function LeaderboardScreen({ navigation }) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState("totalSales");
  const { data, isLoading, isError, refetch, isRefetching } = useLeaderboard();

  const entries = useMemo(() => {
    const raw = data?.leaderboard || data?.data?.leaderboard || data || [];
    const arr = Array.isArray(raw) ? [...raw] : [];
    arr.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    return arr;
  }, [data, sortBy]);

  const totals = useMemo(() => {
    let sales = 0,
      revenue = 0;
    entries.forEach((e) => {
      sales += e.totalSales || 0;
      revenue += e.totalRevenue || 0;
    });
    return { members: entries.length, sales, revenue };
  }, [entries]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Trophy size={18} color="#f59e0b" />
        <Text className="text-lg font-semibold text-slate-800 ml-2">
          Leaderboard
        </Text>
      </View>

      {/* Summary */}
      <View className="flex-row px-4 py-3 bg-white border-b border-slate-100 gap-3">
        <View className="flex-1 bg-emerald-50 rounded-xl px-3 py-2">
          <Text className="text-xs text-emerald-600">Total Sales</Text>
          <Text className="text-base font-bold text-emerald-700">{totals.sales}</Text>
        </View>
        <View className="flex-1 bg-blue-50 rounded-xl px-3 py-2">
          <Text className="text-xs text-blue-600">Revenue</Text>
          <Text className="text-base font-bold text-blue-700">{fmtCurrency(totals.revenue)}</Text>
        </View>
        <View className="flex-1 bg-slate-100 rounded-xl px-3 py-2">
          <Text className="text-xs text-slate-500">Team</Text>
          <Text className="text-base font-bold text-slate-700">{totals.members}</Text>
        </View>
      </View>

      {/* Sort tabs */}
      <View className="flex-row px-4 py-2 bg-white border-b border-slate-100 gap-2">
        {[
          { key: "totalSales", label: "Sales" },
          { key: "totalRevenue", label: "Revenue" },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            className={`px-4 py-2 rounded-full ${
              sortBy === key ? "bg-emerald-500" : "bg-slate-100"
            }`}
            onPress={() => setSortBy(key)}
          >
            <Text
              className={`text-xs font-semibold ${
                sortBy === key ? "text-white" : "text-slate-600"
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : isError ? (
        <ErrorRetry message="Failed to load leaderboard" onRetry={refetch} />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#10b981" />
          }
        >
          {entries.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">🏆</Text>
              <Text className="text-base text-slate-400">No data yet</Text>
            </View>
          ) : (
            entries.map((entry, idx) => {
              const isMe =
                entry._id === (user?._id || user?.id);
              const rank = idx + 1;
              return (
                <View
                  key={entry._id}
                  className={`mx-4 mt-3 rounded-2xl p-4 shadow-sm ${
                    isMe ? "bg-emerald-50 border border-emerald-200" : "bg-white"
                  }`}
                >
                  <View className="flex-row items-center">
                    <RankIcon rank={rank} />
                    <MemberAvatar name={entry.name} />
                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-semibold text-slate-800">
                          {entry.name}
                        </Text>
                        {isMe && (
                          <View className="bg-emerald-500 rounded-full px-2 py-0.5 ml-2">
                            <Text className="text-white text-[10px] font-bold">You</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-slate-400 mt-0.5">
                        {entry.totalSales || 0} sales · {fmtCurrency(entry.totalRevenue)}
                      </Text>
                    </View>
                    <Text className="text-lg font-bold text-slate-700">
                      {sortBy === "totalRevenue"
                        ? fmtCurrency(entry.totalRevenue)
                        : entry.totalSales || 0}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          <View className="h-6" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
