import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlusCircle, Users, ArrowLeft, ChevronRight } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../contexts/AuthContext";
import { authAPI, organizationAPI } from "../../services/api";

const EMERALD = "#10b981";

export default function WelcomeScreen() {
  const { user, refreshUser } = useAuth();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [loading, setLoading] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);

  // Create org fields
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");

  // Join org fields
  const [orgCode, setOrgCode] = useState("");

  useEffect(() => {
    checkExistingOrg();
  }, []);

  const checkExistingOrg = async () => {
    try {
      const res = await organizationAPI.getDetails();
      if (res.data.success) {
        // User already has an org — complete first login and refresh
        await completeFirstLogin();
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No org — show the welcome screen
      }
    } finally {
      setCheckingOrg(false);
    }
  };

  const completeFirstLogin = async () => {
    try {
      await authAPI.completeFirstLogin();
    } catch (_) {}
    await refreshUser();
  };

  const handleCreate = async () => {
    if (!orgName.trim()) {
      Toast.show({ type: "error", text1: "Error", text2: "Organization name is required" });
      return;
    }
    setLoading(true);
    try {
      const res = await organizationAPI.create({
        name: orgName.trim(),
        description: orgDescription.trim(),
      });
      if (res.data.success) {
        Toast.show({ type: "success", text1: "Success", text2: "Organization created!" });
        await completeFirstLogin();
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.response?.data?.msg || "Failed to create organization" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = orgCode.trim().toUpperCase();
    if (code.length !== 6) {
      Toast.show({ type: "error", text1: "Error", text2: "Organization code must be exactly 6 characters" });
      return;
    }
    setLoading(true);
    try {
      const res = await organizationAPI.join(code);
      if (res.data.success) {
        Toast.show({ type: "success", text1: "Success", text2: "Successfully joined organization!" });
        await completeFirstLogin();
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.response?.data?.msg || "Failed to join organization" });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await completeFirstLogin();
  };

  if (checkingOrg) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={EMERALD} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center mt-12 mb-8">
            <Text className="text-4xl mb-3">🐢</Text>
            <Text className="text-2xl font-bold text-slate-800">
              Welcome, {user?.name?.split(" ")[0] || "User"}!
            </Text>
            <Text className="text-sm text-slate-500 mt-2 text-center leading-5">
              Set up your sales organization to start tracking performance
            </Text>
          </View>

          {/* ─── Selection Mode ─── */}
          {!mode && (
            <View>
              {/* Create Card */}
              <TouchableOpacity
                className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm"
                onPress={() => setMode("create")}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-emerald-50 items-center justify-center mr-4">
                    <PlusCircle size={24} color={EMERALD} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800">
                      Create Organization
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Start your own team and invite members
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </View>
                <View className="flex-row mt-3 gap-2">
                  <View className="bg-emerald-50 rounded-full px-2.5 py-1">
                    <Text className="text-xs text-emerald-700">Full Control</Text>
                  </View>
                  <View className="bg-emerald-50 rounded-full px-2.5 py-1">
                    <Text className="text-xs text-emerald-700">Team Mgmt</Text>
                  </View>
                  <View className="bg-emerald-50 rounded-full px-2.5 py-1">
                    <Text className="text-xs text-emerald-700">Analytics</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Join Card */}
              <TouchableOpacity
                className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm"
                onPress={() => setMode("join")}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-4">
                    <Users size={24} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800">
                      Join Organization
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Enter a 6-character code from your team lead
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </View>
                <View className="flex-row mt-3 gap-2">
                  <View className="bg-blue-50 rounded-full px-2.5 py-1">
                    <Text className="text-xs text-blue-700">Quick Access</Text>
                  </View>
                  <View className="bg-blue-50 rounded-full px-2.5 py-1">
                    <Text className="text-xs text-blue-700">Collaboration</Text>
                  </View>
                  <View className="bg-blue-50 rounded-full px-2.5 py-1">
                    <Text className="text-xs text-blue-700">Instant Setup</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Skip */}
              <TouchableOpacity className="items-center py-3" onPress={handleSkip}>
                <Text className="text-slate-400 text-sm">Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Create Form ─── */}
          {mode === "create" && (
            <View>
              <TouchableOpacity
                className="flex-row items-center mb-5"
                onPress={() => setMode(null)}
                disabled={loading}
              >
                <ArrowLeft size={18} color="#64748b" />
                <Text className="text-slate-600 ml-1 text-sm">Back</Text>
              </TouchableOpacity>

              <Text className="text-lg font-bold text-slate-800 mb-1">
                Create Your Organization
              </Text>
              <Text className="text-sm text-slate-500 mb-6">
                Set up your team details
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  Organization Name *
                </Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800"
                  placeholder="e.g. East Coast Sales Team"
                  placeholderTextColor="#94a3b8"
                  value={orgName}
                  onChangeText={setOrgName}
                  maxLength={100}
                  editable={!loading}
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  Description (Optional)
                </Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
                  placeholder="Describe your organization..."
                  placeholderTextColor="#94a3b8"
                  value={orgDescription}
                  onChangeText={setOrgDescription}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                className="bg-emerald-500 rounded-xl py-4 items-center shadow-sm"
                onPress={handleCreate}
                disabled={loading || !orgName.trim()}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Create Organization
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Join Form ─── */}
          {mode === "join" && (
            <View>
              <TouchableOpacity
                className="flex-row items-center mb-5"
                onPress={() => setMode(null)}
                disabled={loading}
              >
                <ArrowLeft size={18} color="#64748b" />
                <Text className="text-slate-600 ml-1 text-sm">Back</Text>
              </TouchableOpacity>

              <Text className="text-lg font-bold text-slate-800 mb-1">
                Join Organization
              </Text>
              <Text className="text-sm text-slate-500 mb-6">
                Enter the code shared by your team leader
              </Text>

              <View className="mb-2">
                <Text className="text-sm font-semibold text-slate-700 mb-2">
                  Organization Code *
                </Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-lg text-slate-800 tracking-widest text-center font-bold"
                  placeholder="XXXXXX"
                  placeholderTextColor="#94a3b8"
                  value={orgCode}
                  onChangeText={(t) => setOrgCode(t.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>
              <Text className="text-xs text-slate-400 mb-6">
                The code is a 6-character alphanumeric string provided by the org owner.
              </Text>

              <TouchableOpacity
                className="bg-emerald-500 rounded-xl py-4 items-center shadow-sm"
                onPress={handleJoin}
                disabled={loading || orgCode.length !== 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Join Organization
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
