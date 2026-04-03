import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Shield,
  Crown,
  UserMinus,
  TrendingUp,
  Trash2,
  X,
  Pencil,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { organizationAPI } from "../../services/api";

const EMERALD = "#10b981";

// ─── Role Badge ──────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = {
    owner: { bg: "bg-amber-50", text: "text-amber-700", label: "Owner" },
    manager: { bg: "bg-blue-50", text: "text-blue-700", label: "Manager" },
    employee: { bg: "bg-slate-100", text: "text-slate-600", label: "Member" },
  }[role] || { bg: "bg-slate-100", text: "text-slate-600", label: role };

  return (
    <View className={`${cfg.bg} rounded-full px-2.5 py-0.5`}>
      <Text className={`${cfg.text} text-xs font-semibold`}>{cfg.label}</Text>
    </View>
  );
}

// ─── Initials Avatar ─────────────────────────────────────────────────
function MemberAvatar({ name, size = 40 }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-emerald-100 items-center justify-center"
    >
      <Text style={{ fontSize: size * 0.36 }} className="font-bold text-emerald-700">
        {initials}
      </Text>
    </View>
  );
}

export default function ManageOrgScreen({ navigation }) {
  const { user, isOwner, setIsOwner, setIsManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrg = useCallback(async () => {
    try {
      const res = await organizationAPI.getDetails();
      if (res.data.success) {
        setOrg(res.data.organization);
        setMembers(res.data.organization?.members || []);
        setIsOwner(res.data.isOwner);
        setIsManager(res.data.isManager || res.data.isOwner);
        setEditName(res.data.organization.name);
        setEditDesc(res.data.organization.description || "");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        Alert.alert("No Organization", "Please create or join one first.");
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  }, [navigation, setIsOwner, setIsManager]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const copyCode = async () => {
    if (!org?.code) return;
    await Clipboard.setStringAsync(org.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveOrg = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await organizationAPI.updateDetails({
        name: editName.trim(),
        description: editDesc.trim(),
      });
      if (res.data.success) {
        setEditMode(false);
        fetchOrg();
        Toast.show({ type: "success", text1: "Success", text2: "Organization updated" });
      }
    } catch (err) {
      Toast.show({ type: "error", text1: "Error", text2: err.response?.data?.msg || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    Alert.alert(
      "Remove Member",
      `Remove ${memberName} from the organization?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingId(memberId);
            try {
              const res = await organizationAPI.removeMember(memberId);
              if (res.data.success) fetchOrg();
            } catch (err) {
              Toast.show({ type: "error", text1: "Error", text2: err.response?.data?.msg || "Failed to remove member" });
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handlePromoteMember = (memberId, memberName) => {
    Alert.alert("Promote Member", `Promote ${memberName} to manager?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Promote",
        onPress: async () => {
          try {
            const res = await organizationAPI.promoteMember(memberId);
            if (res.data.success) {
              Toast.show({ type: "success", text1: "Promoted", text2: `${memberName} is now a manager` });
              fetchOrg();
            }
          } catch (err) {
            Toast.show({ type: "error", text1: "Error", text2: err.response?.data?.msg || "Promotion failed" });
          }
        },
      },
    ]);
  };

  const handleDeleteOrg = () => {
    Alert.alert(
      "Delete Organization",
      "This will permanently delete the organization and remove all members. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await organizationAPI.deleteOrganization();
              if (res.data.success) {
                Toast.show({ type: "success", text1: "Deleted", text2: "Organization has been deleted." });
                navigation.goBack();
              }
            } catch (err) {
              Toast.show({ type: "error", text1: "Error", text2: err.response?.data?.msg || "Delete failed" });
            }
          },
        },
      ]
    );
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={EMERALD} />
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
          {org?.name || "Organization"}
        </Text>
        {isOwner && !editMode && (
          <TouchableOpacity onPress={() => setEditMode(true)}>
            <Pencil size={18} color={EMERALD} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Edit mode */}
        {editMode && (
          <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-3">
              Edit Organization
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 mb-3"
              value={editName}
              onChangeText={setEditName}
              placeholder="Organization name"
              placeholderTextColor="#94a3b8"
              maxLength={100}
            />
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 mb-4"
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Description (optional)"
              placeholderTextColor="#94a3b8"
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 64 }}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl border border-slate-200 items-center"
                onPress={() => setEditMode(false)}
                disabled={saving}
              >
                <Text className="text-slate-600 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-emerald-500 items-center"
                onPress={handleSaveOrg}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Org Details */}
        {!editMode && org?.description ? (
          <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-1">
              Description
            </Text>
            <Text className="text-sm text-slate-700">{org.description}</Text>
          </View>
        ) : null}

        {/* Invitation Code */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Invitation Code
          </Text>
          <Text className="text-xs text-slate-400 mb-3">
            Share this code so others can join your organization
          </Text>
          <TouchableOpacity
            className="flex-row items-center bg-slate-50 rounded-xl px-4 py-3"
            onPress={copyCode}
            activeOpacity={0.7}
          >
            <Text className="text-xl font-bold text-slate-800 tracking-widest flex-1">
              {org?.code || "------"}
            </Text>
            {copied ? (
              <Check size={18} color={EMERALD} />
            ) : (
              <Copy size={18} color="#64748b" />
            )}
          </TouchableOpacity>
        </View>

        {/* Members */}
        <View className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <View className="px-4 py-3 border-b border-slate-100 flex-row items-center">
            <Users size={16} color="#64748b" />
            <Text className="text-xs font-semibold text-slate-500 uppercase ml-2">
              Team Members ({members.length})
            </Text>
          </View>

          {members.length === 0 ? (
            <View className="p-6 items-center">
              <Text className="text-sm text-slate-400">No members yet</Text>
            </View>
          ) : (
            members.map((m) => {
              const member = m.user;
              const isCurrentUser = member._id === (user?._id || user?.id);
              return (
                <View
                  key={member._id}
                  className="flex-row items-center px-4 py-3 border-b border-slate-50"
                >
                  <MemberAvatar name={member.name} size={40} />
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-slate-800">
                        {member.name}
                        {isCurrentUser ? " (You)" : ""}
                      </Text>
                      <RoleBadge role={m.role} />
                    </View>
                    <Text className="text-xs text-slate-400 mt-0.5">
                      Joined {formatDate(m.joinedAt)}
                    </Text>
                  </View>

                  {/* Owner actions on non-self members */}
                  {isOwner && !isCurrentUser && m.role !== "owner" && (
                    <View className="flex-row gap-2">
                      {m.role === "employee" && (
                        <TouchableOpacity
                          className="bg-blue-50 rounded-lg px-2 py-1.5"
                          onPress={() =>
                            handlePromoteMember(member._id, member.name)
                          }
                        >
                          <TrendingUp size={14} color="#3b82f6" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        className="bg-red-50 rounded-lg px-2 py-1.5"
                        onPress={() =>
                          handleRemoveMember(member._id, member.name)
                        }
                        disabled={removingId === member._id}
                      >
                        {removingId === member._id ? (
                          <ActivityIndicator size={14} color="#ef4444" />
                        ) : (
                          <UserMinus size={14} color="#ef4444" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Danger Zone */}
        {isOwner && (
          <View className="mx-4 mt-6 bg-white rounded-2xl p-4 shadow-sm border border-red-100">
            <Text className="text-xs font-semibold text-red-500 uppercase mb-1">
              Danger Zone
            </Text>
            <Text className="text-xs text-slate-500 mb-3">
              Permanently delete this organization and remove all members.
            </Text>
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-3 items-center"
              onPress={handleDeleteOrg}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-sm">
                Delete Organization
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
