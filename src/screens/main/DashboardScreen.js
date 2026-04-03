import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Settings,
  Map,
  ArrowRight,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";

const EMERALD = "#10b981";

const QuickAction = ({ icon: Icon, title, subtitle, onPress, color }) => (
  <TouchableOpacity
    className="bg-white rounded-2xl p-4 shadow-sm mb-3"
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View className="flex-row items-center">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-slate-800">{title}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
      </View>
      <ArrowRight size={16} color="#94a3b8" />
    </View>
  </TouchableOpacity>
);

export default function DashboardScreen({ navigation }) {
  const { user, isOwner, isManager } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-800">
            {greeting}, {firstName} 👋
          </Text>
          <Text className="text-sm text-slate-500 mt-1">
            {isOwner ? "Owner" : isManager ? "Manager" : "Sales Rep"} Dashboard
          </Text>
        </View>

        {/* Quick Actions */}
        <Text className="text-base font-semibold text-slate-800 mb-3">
          Quick Actions
        </Text>

        <QuickAction
          icon={ClipboardList}
          title="Record Door"
          subtitle="Log a new door knock"
          color={EMERALD}
          onPress={() => navigation.navigate("RecordDoor")}
        />
        <QuickAction
          icon={BarChart3}
          title="View Sales"
          subtitle="Browse closed deals"
          color="#8b5cf6"
          onPress={() => navigation.navigate("ViewSales")}
        />
        <QuickAction
          icon={TrendingUp}
          title="Leaderboard"
          subtitle="Team performance rankings"
          color="#f59e0b"
          onPress={() => navigation.navigate("Leaderboard")}
        />
        <QuickAction
          icon={BarChart3}
          title="KPI Tracker"
          subtitle="Door knock statistics"
          color="#06b6d4"
          onPress={() => navigation.navigate("KpiTracker")}
        />
        <QuickAction
          icon={Clock}
          title="View Timeslots"
          subtitle="Your assigned schedules"
          color="#6366f1"
          onPress={() => navigation.navigate("ViewTimeslots")}
        />

        {/* Manager / Owner Actions */}
        {isManager && (
          <>
            <Text className="text-base font-semibold text-slate-800 mt-6 mb-3">
              {isOwner ? "Owner" : "Manager"} Tools
            </Text>
            <QuickAction
              icon={Users}
              title="Manage Organization"
              subtitle="Team settings & members"
              color="#f97316"
              onPress={() => navigation.navigate("ManageOrg")}
            />
            <QuickAction
              icon={Settings}
              title="Manage Timeslots"
              subtitle="Assign work schedules"
              color="#14b8a6"
              onPress={() => navigation.navigate("ManageTimeslots")}
            />
            <QuickAction
              icon={DollarSign}
              title="Employee Paystub"
              subtitle="Payroll information"
              color="#ef4444"
              onPress={() => navigation.navigate("EmployeePaystub")}
            />
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
