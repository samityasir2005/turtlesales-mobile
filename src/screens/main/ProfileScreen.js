import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  User,
  Mail,
  Hash,
  Pencil,
  LogOut as LogOutIcon,
  Trash2,
  X,
  ChevronRight,
  Shield,
  ImageOff,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { authAPI, organizationAPI } from "../../services/api";

const EMERALD = "#10b981";

// ─── Avatar Component ────────────────────────────────────────────────
function ProfileAvatar({ uri, name, size = 96, onPress, uploading }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={uploading}
      activeOpacity={0.8}
      className="items-center"
    >
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="bg-emerald-100 items-center justify-center overflow-hidden"
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{ fontSize: size * 0.38 }}
            className="font-bold text-emerald-700"
          >
            {initials}
          </Text>
        )}
        {/* Overlay */}
        <View
          style={{ borderRadius: size / 2 }}
          className="absolute inset-0 bg-black/30 items-center justify-center opacity-0"
        />
      </View>
      {/* Camera badge */}
      <View className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 shadow-sm">
        {uploading ? (
          <ActivityIndicator size={14} color="#fff" />
        ) : (
          <Camera size={14} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Edit Name Modal ─────────────────────────────────────────────────
function EditNameModal({ visible, currentName, onClose, onSave, loading }) {
  const [name, setName] = useState(currentName || "");

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Error", "Name must be at least 2 characters");
      return;
    }
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-800">Edit Name</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 mb-4"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#94a3b8"
            maxLength={50}
            autoFocus
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-slate-200 items-center"
              onPress={onClose}
              disabled={loading}
            >
              <Text className="text-slate-600 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl bg-emerald-500 items-center"
              onPress={handleSave}
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Confirm Modal ───────────────────────────────────────────────────
function ConfirmModal({
  visible,
  title,
  message,
  warning,
  confirmText,
  onClose,
  onConfirm,
  loading,
  destructive = true,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-sm">
          <Text className="text-lg font-bold text-slate-800 mb-2">
            {title}
          </Text>
          <Text className="text-sm text-slate-600 mb-3">{message}</Text>
          {warning && (
            <View className="bg-red-50 rounded-xl p-3 mb-4">
              <Text className="text-xs text-red-600">{warning}</Text>
            </View>
          )}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-slate-200 items-center"
              onPress={onClose}
              disabled={loading}
            >
              <Text className="text-slate-600 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center ${destructive ? "bg-red-500" : "bg-emerald-500"}`}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold">{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value, onEdit }) {
  return (
    <View className="flex-row items-center py-4 border-b border-slate-100">
      <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center mr-3">
        <Icon size={16} color="#64748b" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
        <Text className="text-sm font-medium text-slate-800">{value}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} className="p-2">
          <Pencil size={16} color={EMERALD} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Profile Screen ─────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, setUser, signOut } = useAuth();
  const [uploadLoading, setUploadLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [leaveOrgModalVisible, setLeaveOrgModalVisible] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // ── Upload profile picture ──
  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || "profile.jpg",
      });

      const res = await authAPI.uploadProfilePicture(formData);
      if (res.data.success) {
        setUser(res.data.user);
        Toast.show({ type: "success", text1: "Success", text2: "Profile picture updated!" });
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.response?.data?.msg || "Failed to upload picture" });
    } finally {
      setUploadLoading(false);
    }
  }, [setUser]);

  // ── Remove profile picture ──
  const handleRemovePicture = useCallback(async () => {
    setUploadLoading(true);
    try {
      const res = await authAPI.removeProfilePicture();
      if (res.data.success) {
        setUser(res.data.user);
        Toast.show({ type: "success", text1: "Success", text2: "Profile picture removed" });
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.response?.data?.msg || "Failed to remove picture" });
    } finally {
      setUploadLoading(false);
    }
  }, [setUser]);

  // ── Update name ──
  const handleUpdateName = useCallback(
    async (newName) => {
      setEditLoading(true);
      try {
        const res = await authAPI.updateProfile({ name: newName });
        if (res.data.success) {
          setUser(res.data.user);
          setEditModalVisible(false);
          Toast.show({ type: "success", text1: "Success", text2: "Name updated successfully" });
        }
      } catch (error) {
        Toast.show({ type: "error", text1: "Error", text2: error.response?.data?.msg || "Failed to update name" });
      } finally {
        setEditLoading(false);
      }
    },
    [setUser]
  );

  // ── Delete account ──
  const handleDeleteAccount = useCallback(async () => {
    setDeleteLoading(true);
    try {
      const res = await authAPI.deleteAccount();
      if (res.data.success) {
        setDeleteModalVisible(false);
        await signOut();
      }
    } catch (error) {
      Alert.alert("Error", error.response?.data?.msg || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  }, [signOut]);

  // ── Leave organization ──
  const handleLeaveOrg = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await organizationAPI.leaveOrganization();
      if (res.data.success) {
        setLeaveOrgModalVisible(false);
        Toast.show({ type: "success", text1: "Success", text2: "You have left the organization." });
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.response?.data?.msg || "Failed to leave organization" });
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  // ── Logout ──
  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }, [signOut]);

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={EMERALD} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-slate-800">Profile</Text>
        </View>

        {/* Avatar Card */}
        <View className="mx-4 mt-2 bg-white rounded-2xl p-6 shadow-sm items-center">
          <ProfileAvatar
            uri={user.profilePicture}
            name={user.name}
            size={96}
            onPress={handlePickImage}
            uploading={uploadLoading}
          />
          <Text className="text-lg font-bold text-slate-800 mt-4">
            {user.name}
          </Text>
          <Text className="text-sm text-slate-500 mt-0.5">Team Member</Text>

          {user.profilePicture && (
            <TouchableOpacity
              className="mt-3 flex-row items-center"
              onPress={handleRemovePicture}
              disabled={uploadLoading}
            >
              <ImageOff size={14} color="#ef4444" />
              <Text className="text-red-500 text-xs font-medium ml-1">
                Remove Photo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Details Card */}
        <View className="mx-4 mt-4 bg-white rounded-2xl px-4 shadow-sm">
          <View className="py-3 border-b border-slate-100">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Profile Information
            </Text>
          </View>

          <DetailRow
            icon={User}
            label="Full Name"
            value={user.name}
            onEdit={() => setEditModalVisible(true)}
          />
          <DetailRow icon={Mail} label="Email Address" value={user.email} />
          <DetailRow
            icon={Hash}
            label="User ID"
            value={`#${user._id?.slice(-6) || user.id || "—"}`}
          />
        </View>

        {/* Account Management */}
        <View className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden shadow-sm">
          <View className="px-4 py-3 border-b border-slate-100">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Account Management
            </Text>
          </View>

          <TouchableOpacity
            className="flex-row items-center px-4 py-4 border-b border-slate-100"
            onPress={() => setLeaveOrgModalVisible(true)}
          >
            <View className="w-8 h-8 rounded-lg bg-orange-50 items-center justify-center mr-3">
              <LogOutIcon size={16} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-slate-800">
                Leave Organization
              </Text>
              <Text className="text-xs text-slate-500">
                Exit your current organization
              </Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center px-4 py-4"
            onPress={() => setDeleteModalVisible(true)}
          >
            <View className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center mr-3">
              <Trash2 size={16} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-red-600">
                Delete Account
              </Text>
              <Text className="text-xs text-slate-500">
                Permanently remove your account
              </Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View className="mx-4 mt-4 mb-8">
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center shadow-sm border border-slate-100"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <LogOutIcon size={18} color="#ef4444" />
              <Text className="text-red-500 font-semibold text-base ml-2">
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="h-4" />
      </ScrollView>

      {/* Modals */}
      <EditNameModal
        visible={editModalVisible}
        currentName={user.name}
        onClose={() => setEditModalVisible(false)}
        onSave={handleUpdateName}
        loading={editLoading}
      />

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account?"
        warning="This action cannot be undone. All your data, sales records, and organization memberships will be permanently removed."
        confirmText="Delete Account"
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
        destructive
      />

      <ConfirmModal
        visible={leaveOrgModalVisible}
        title="Leave Organization"
        message="Are you sure you want to leave this organization?"
        warning="You will no longer have access to organization data and will need to join or create a new organization."
        confirmText="Leave"
        onClose={() => setLeaveOrgModalVisible(false)}
        onConfirm={handleLeaveOrg}
        loading={leaveLoading}
        destructive
      />
    </SafeAreaView>
  );
}
