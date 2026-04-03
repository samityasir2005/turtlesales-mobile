import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

export default function ErrorRetry({ message, onRetry }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <AlertTriangle size={40} color="#ef4444" />
      <Text className="text-slate-700 text-base font-semibold mt-4 text-center">
        Something went wrong
      </Text>
      <Text className="text-slate-500 text-sm mt-1 text-center">
        {message || "Failed to load data"}
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="flex-row items-center bg-emerald-500 rounded-xl px-6 py-3 mt-6"
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color="#fff" />
          <Text className="text-white font-semibold ml-2">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
