import "./global.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import Toast from "react-native-toast-message";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 1 },
  },
});

function AnimatedSplash({ onFinish }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.15,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, []);

  return (
    <Animated.View
      style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#ecfdf5",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Image
        source={require("./assets/logo.png")}
        style={{ width: 160, height: 160 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

function AppContent() {
  const { isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [isLoading]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AppNavigator />
      {appReady && !splashDone && <AnimatedSplash onFinish={handleSplashFinish} />}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent />
            <Toast position="bottom" bottomOffset={100} />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
