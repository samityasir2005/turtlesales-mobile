import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Home, Map, PlusCircle, MessageSquare, User } from "lucide-react-native";

import { useAuth } from "../contexts/AuthContext";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";

import WelcomeScreen from "../screens/auth/WelcomeScreen";

// Main Tab Screens
import DashboardScreen from "../screens/main/DashboardScreen";
import MapScreen from "../screens/main/MapScreen";
import RecordDoorScreen from "../screens/main/RecordDoorScreen";
import MessagesScreen from "../screens/main/MessagesScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

// Stack Screens
import ViewSalesScreen from "../screens/stack/ViewSalesScreen";
import LeaderboardScreen from "../screens/stack/LeaderboardScreen";
import KpiTrackerScreen from "../screens/stack/KpiTrackerScreen";
import ManageOrgScreen from "../screens/stack/ManageOrgScreen";
import ManageTimeslotsScreen from "../screens/stack/ManageTimeslotsScreen";
import ViewTimeslotsScreen from "../screens/stack/ViewTimeslotsScreen";
import EmployeePaystubScreen from "../screens/stack/EmployeePaystubScreen";
import PrivateChatScreen from "../screens/stack/PrivateChatScreen";

const AuthStack = createStackNavigator();
const MainTab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const MapStack = createStackNavigator();
const DoorStack = createStackNavigator();
const MsgStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const EMERALD = "#10b981";
const SLATE_400 = "#94a3b8";

// ─── Stack wrappers so each tab keeps its own navigation state ───────
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="DashboardHome" component={DashboardScreen} />
      <HomeStack.Screen name="ViewSales" component={ViewSalesScreen} />
      <HomeStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <HomeStack.Screen name="KpiTracker" component={KpiTrackerScreen} />
      <HomeStack.Screen name="ManageOrg" component={ManageOrgScreen} />
      <HomeStack.Screen name="ManageTimeslots" component={ManageTimeslotsScreen} />
      <HomeStack.Screen name="ViewTimeslots" component={ViewTimeslotsScreen} />
      <HomeStack.Screen name="EmployeePaystub" component={EmployeePaystubScreen} />
    </HomeStack.Navigator>
  );
}

function MapStackScreen() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="MapHome" component={MapScreen} />
    </MapStack.Navigator>
  );
}

function DoorStackScreen() {
  return (
    <DoorStack.Navigator screenOptions={{ headerShown: false }}>
      <DoorStack.Screen name="RecordDoorHome" component={RecordDoorScreen} />
    </DoorStack.Navigator>
  );
}

function MsgStackScreen() {
  return (
    <MsgStack.Navigator screenOptions={{ headerShown: false }}>
      <MsgStack.Screen name="MessagesHome" component={MessagesScreen} />
      <MsgStack.Screen name="PrivateChat" component={PrivateChatScreen} />
    </MsgStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Bottom Tabs ─────────────────────────────────────────────────────
function MainTabs() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: EMERALD,
        tabBarInactiveTintColor: SLATE_400,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const iconSize = 22;
          switch (route.name) {
            case "Dashboard":
              return <Home size={iconSize} color={color} />;
            case "Map":
              return <Map size={iconSize} color={color} />;
            case "RecordDoor":
              return <PlusCircle size={iconSize} color={color} />;
            case "Messages":
              return <MessageSquare size={iconSize} color={color} />;
            case "Profile":
              return <User size={iconSize} color={color} />;
            default:
              return null;
          }
        },
      })}
    >
      <MainTab.Screen name="Dashboard" component={HomeStackScreen} />
      <MainTab.Screen name="Map" component={MapStackScreen} />
      <MainTab.Screen
        name="RecordDoor"
        component={DoorStackScreen}
        options={{ tabBarLabel: "Record" }}
      />
      <MainTab.Screen name="Messages" component={MsgStackScreen} />
      <MainTab.Screen name="Profile" component={ProfileStackScreen} />
    </MainTab.Navigator>
  );
}

// ─── Auth Navigator ──────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Root Navigator ──────────────────────────────────────────────────
export default function AppNavigator() {
  const { token, isLoading, user } = useAuth();

  return (
    <NavigationContainer>
      {isLoading ? (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color={EMERALD} />
        </View>
      ) : token ? (
        user?.firstLogin ? (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          </AuthStack.Navigator>
        ) : (
          <MainTabs />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
