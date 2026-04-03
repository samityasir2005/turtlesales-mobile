import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Send } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import useChatStore from "../../stores/chatStore";

const EMERALD = "#10b981";

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

export default function PrivateChatScreen({ navigation, route }) {
  const { userId, userName } = route.params || {};
  const { user } = useAuth();
  const myId = user?._id || user?.id;
  const scrollRef = useRef(null);
  const [inputText, setInputText] = React.useState("");

  const {
    fetchPmHistory,
    sendMessage,
    pmMessages,
    typingUsers,
    rateLimited,
    socket,
  } = useChatStore();

  useEffect(() => {
    if (userId) fetchPmHistory(userId);
  }, [userId]);

  const messages = pmMessages[userId] || [];

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || rateLimited) return;
    sendMessage(text, "private", userId);
    setInputText("");
    if (socket) socket.emit("emitStopTyping", { type: "private", receiverId: userId });
  }, [inputText, rateLimited, sendMessage, userId, socket]);

  const handleTyping = useCallback(
    (v) => {
      setInputText(v);
      if (socket && v.trim()) {
        socket.emit("emitTyping", { type: "private", receiverId: userId });
      } else if (socket) {
        socket.emit("emitStopTyping", { type: "private", receiverId: userId });
      }
    },
    [socket, userId]
  );

  const peerTyping = typingUsers[userId];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3">
          <Text className="text-xs font-bold text-emerald-700">
            {(userName || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <Text className="text-lg font-semibold text-slate-800">{userName || "Chat"}</Text>
      </View>

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
          {messages.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-4xl mb-2">✉️</Text>
              <Text className="text-sm text-slate-400">
                Start a conversation with {userName}
              </Text>
            </View>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={msg._id || `pm-${i}`}
                msg={msg}
                isMe={msg.sender === myId}
              />
            ))
          )}
          {peerTyping && (
            <Text className="text-xs text-slate-400 italic mb-2">
              {peerTyping} is typing…
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
    </SafeAreaView>
  );
}
