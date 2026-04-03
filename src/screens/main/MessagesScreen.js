import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Users, MessageCircle, Wifi, WifiOff } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import useChatStore from "../../stores/chatStore";

const EMERALD = "#10b981";

const STATUS_COLORS = {
  online: "#22c55e",
  away: "#f59e0b",
  dnd: "#ef4444",
  offline: "#94a3b8",
};

function MemberAvatar({ name, size = 36, status }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="bg-emerald-100 items-center justify-center">
      <Text style={{ fontSize: size * 0.36 }} className="font-bold text-emerald-700">{initials}</Text>
      {status && (
        <View
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: STATUS_COLORS[status] || STATUS_COLORS.offline }}
        />
      )}
    </View>
  );
}

function MessageBubble({ msg, isMe }) {
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <View className={`mb-2 max-w-[80%] ${isMe ? "self-end" : "self-start"}`}>
      {!isMe && (
        <Text className="text-[10px] text-slate-400 mb-0.5 ml-1">{msg.senderName}</Text>
      )}
      <View className={`rounded-2xl px-3.5 py-2.5 ${isMe ? "bg-emerald-500 rounded-br-md" : "bg-white rounded-bl-md shadow-sm"}`}>
        <Text className={`text-sm ${isMe ? "text-white" : "text-slate-800"}`}>
          {msg.content}
        </Text>
      </View>
      <Text className={`text-[9px] mt-0.5 ${isMe ? "text-right text-slate-400 mr-1" : "text-slate-300 ml-1"}`}>
        {time}
      </Text>
    </View>
  );
}

export default function MessagesScreen({ navigation }) {
  const { user, token } = useAuth();
  const myId = user?._id || user?.id;
  const inputRef = useRef("");
  const scrollRef = useRef(null);
  const [inputText, setInputText] = React.useState("");
  const [tab, setTab] = React.useState("chat"); // chat | members

  const {
    connect,
    disconnect,
    setMyUserId,
    fetchMembers,
    fetchGroupHistory,
    sendMessage,
    connected,
    members,
    groupMessages,
    typingUsers,
    rateLimited,
    unreadPms,
    socket,
  } = useChatStore();

  useEffect(() => {
    if (token && myId) {
      setMyUserId(myId);
      connect(token);
      fetchMembers();
      fetchGroupHistory();
    }
    return () => {};
  }, [token, myId]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || rateLimited) return;
    sendMessage(text, "group");
    setInputText("");

    if (socket) {
      socket.emit("emitStopTyping", { type: "group" });
    }
  }, [inputText, rateLimited, sendMessage, socket]);

  const handleTyping = useCallback(
    (v) => {
      setInputText(v);
      if (socket && v.trim()) {
        socket.emit("emitTyping", { type: "group" });
      } else if (socket) {
        socket.emit("emitStopTyping", { type: "group" });
      }
    },
    [socket]
  );

  const openPm = (member) => {
    navigation.navigate("PrivateChat", {
      userId: member._id,
      userName: member.name,
    });
  };

  const typingGroup = typingUsers.group || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <MessageCircle size={18} color={EMERALD} />
        <Text className="text-lg font-semibold text-slate-800 ml-2 flex-1">
          Messages
        </Text>
        <View className="flex-row items-center">
          {connected ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#94a3b8" />}
          <Text className="text-[10px] text-slate-400 ml-1">
            {connected ? "Online" : "Connecting…"}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View className="flex-row px-4 py-2 bg-white border-b border-slate-100 gap-2">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${tab === "chat" ? "bg-emerald-500" : "bg-slate-100"}`}
          onPress={() => setTab("chat")}
        >
          <Text className={`text-xs font-semibold ${tab === "chat" ? "text-white" : "text-slate-600"}`}>
            Team Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${tab === "members" ? "bg-emerald-500" : "bg-slate-100"}`}
          onPress={() => setTab("members")}
        >
          <Text className={`text-xs font-semibold ${tab === "members" ? "text-white" : "text-slate-600"}`}>
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "members" ? (
        /* ── Members list ── */
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {members.map((m) => {
            const isMe = m._id === myId;
            const unread = unreadPms[m._id] || 0;
            return (
              <TouchableOpacity
                key={m._id}
                className="flex-row items-center px-4 py-3 bg-white border-b border-slate-50"
                onPress={() => !isMe && openPm(m)}
                disabled={isMe}
                activeOpacity={0.7}
              >
                <MemberAvatar name={m.name} status={m.activityStatus} />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-slate-800">
                    {m.name}{isMe ? " (You)" : ""}
                  </Text>
                  <Text className="text-xs text-slate-400 capitalize">
                    {m.role || "member"}
                  </Text>
                </View>
                {unread > 0 && (
                  <View className="bg-emerald-500 rounded-full w-5 h-5 items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        /* ── Group Chat ── */
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={88}
        >
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4 py-2"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {groupMessages.length === 0 ? (
              <View className="items-center py-16">
                <Text className="text-4xl mb-2">💬</Text>
                <Text className="text-sm text-slate-400">No messages yet. Say hello!</Text>
              </View>
            ) : (
              groupMessages.map((msg, i) => (
                <MessageBubble
                  key={msg._id || `msg-${i}`}
                  msg={msg}
                  isMe={msg.sender === myId}
                />
              ))
            )}
            {typingGroup.length > 0 && (
              <Text className="text-xs text-slate-400 italic mb-2">
                {typingGroup.join(", ")} typing…
              </Text>
            )}
          </ScrollView>

          {/* Input */}
          <View className="flex-row items-end px-4 py-3 bg-white border-t border-slate-100">
            <TextInput
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 max-h-24"
              placeholder={rateLimited ? "Slow down…" : "Type a message…"}
              placeholderTextColor="#94a3b8"
              multiline
              value={inputText}
              onChangeText={handleTyping}
              editable={!rateLimited}
            />
            <TouchableOpacity
              className="ml-2 mb-0.5 w-10 h-10 rounded-full bg-emerald-500 items-center justify-center"
              onPress={handleSend}
              disabled={!inputText.trim() || rateLimited}
              activeOpacity={0.7}
            >
              <Send size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
