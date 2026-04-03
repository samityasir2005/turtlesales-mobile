import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Callout } from "react-native-maps";
import {
  RefreshCw,
  MapPin,
  DollarSign,
  Phone,
  X,
  Crosshair,
  HelpCircle,
  Ban,
} from "lucide-react-native";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useGeoJSON, useCreateSale } from "../../hooks/useApi";
import ErrorRetry from "../../components/ErrorRetry";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const STATUS_CFG = {
  no_answer: { color: "#6c757d", label: "No Answer", symbol: "?" },
  not_interested: { color: "#dc3545", label: "Not Interested", symbol: "✕" },
  callback: { color: "#fd7e14", label: "Callback", symbol: "↻" },
  sale_made: { color: "#2D8A4E", label: "Sale Made", symbol: "$" },
  do_not_knock: { color: "#000000", label: "Do Not Knock", symbol: "⊘" },
};

const DEFAULT_REGION = {
  latitude: 43.65,
  longitude: -79.38,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n || 0,
  );

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const { data, isLoading, isError, refetch, isRefetching } = useGeoJSON();
  const createSale = useCreateSale();
  const [selectedPin, setSelectedPin] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [droppedPin, setDroppedPin] = useState(null); // { latitude, longitude, address }
  const [reversingGeo, setReversingGeo] = useState(false);
  const [submitting, setSubmitting] = useState(null);

  const features = useMemo(() => {
    if (!data) return [];
    // Response shape: { success, data: { type: "FeatureCollection", features: [...] }, meta }
    const fc =
      data?.data?.features ||
      data?.features ||
      data?.salesGeoJSON?.features ||
      data?.data?.salesGeoJSON?.features;
    if (Array.isArray(fc)) return fc;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Get user location on mount and zoom to it
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(coords);
        mapRef.current?.animateToRegion(
          {
            ...coords,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          800,
        );
      } catch {}
    })();
  }, []);

  const handleLocateMe = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Enable location permissions to use this feature.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
    } catch {
      Alert.alert("Error", "Could not get your location.");
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (cooldown) return;
    refetch();
    setCooldown(true);
    setTimeout(() => setCooldown(false), 10000);
  }, [cooldown, refetch]);

  // ── Reverse geocode via Mapbox ──
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=1`;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json.features?.[0];
      return feature?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }, []);

  // ── Handle map tap to drop a pin ──
  const handleMapPress = useCallback(
    async (e) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setSelectedPin(null);
      setDroppedPin({ latitude, longitude, address: null });
      setReversingGeo(true);
      const address = await reverseGeocode(latitude, longitude);
      setDroppedPin({ latitude, longitude, address });
      setReversingGeo(false);
    },
    [reverseGeocode],
  );

  // ── Navigate to Record Sale with pre-filled address ──
  const handleRecordSaleHere = useCallback(() => {
    if (!droppedPin) return;
    navigation.navigate("RecordDoor", {
      screen: "RecordDoorHome",
      params: {
        address: droppedPin.address || "",
        lat: droppedPin.latitude,
        lng: droppedPin.longitude,
      },
    });
    setDroppedPin(null);
  }, [droppedPin, navigation]);

  // ── Quick-record no_answer / do_not_knock from map tap (no form needed) ──
  const handleQuickRecord = useCallback(
    (doorStatus) => {
      if (!droppedPin || submitting) return;
      const address =
        droppedPin.address ||
        `${droppedPin.latitude.toFixed(5)}, ${droppedPin.longitude.toFixed(5)}`;
      setSubmitting(doorStatus);
      createSale.mutate(
        {
          doorStatus,
          address,
          coordinates: { lat: droppedPin.latitude, lng: droppedPin.longitude },
        },
        {
          onSuccess: () => {
            Toast.show({
              type: "success",
              text1: doorStatus === "no_answer" ? "No Answer" : "Do Not Knock",
              text2: "Pin recorded on map.",
            });
            setDroppedPin(null);
          },
          onSettled: () => setSubmitting(null),
        },
      );
    },
    [droppedPin, submitting, createSale],
  );

  const initialRegion = useMemo(() => {
    if (features.length === 0) return DEFAULT_REGION;
    let minLat = 90,
      maxLat = -90,
      minLng = 180,
      maxLng = -180;
    features.forEach((f) => {
      const geom = f.geometry?.coordinates;
      if (!geom || geom.length < 2) return;
      const lng = geom[0];
      const lat = geom[1];
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });
    if (minLat > maxLat) return DEFAULT_REGION;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.3),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.3),
    };
  }, [features]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white shadow-sm z-10">
        <MapPin size={18} color="#10b981" />
        <Text className="text-lg font-semibold text-slate-800 ml-2 flex-1">
          Sales Map
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={cooldown || isRefetching}
          className="p-2"
        >
          {isRefetching ? (
            <ActivityIndicator size={16} color="#10b981" />
          ) : (
            <RefreshCw size={18} color={cooldown ? "#cbd5e1" : "#10b981"} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : isError ? (
        <ErrorRetry message="Failed to load map data" onRetry={refetch} />
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            rotateEnabled={false}
            pitchEnabled={false}
            onPress={handleMapPress}
          >
            {features.map((f, i) => {
              const geom = f.geometry?.coordinates;
              if (!geom || geom.length < 2) return null;
              const lng = geom[0];
              const lat = geom[1];
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
              const p = f.properties || {};
              const cfg = STATUS_CFG[p.doorStatus] || STATUS_CFG.no_answer;

              return (
                <Marker
                  key={p.id || f._id || `pin-${i}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  pinColor={cfg.color}
                  onPress={(e) => {
                    e.stopPropagation();
                    setDroppedPin(null);
                    setSelectedPin({ ...p, lat, lng });
                  }}
                />
              );
            })}

            {/* Dropped pin from tap */}
            {droppedPin && (
              <Marker
                coordinate={{
                  latitude: droppedPin.latitude,
                  longitude: droppedPin.longitude,
                }}
                pinColor="#10b981"
              />
            )}
          </MapView>

          {/* Locate Me Button */}
          <TouchableOpacity
            onPress={handleLocateMe}
            style={styles.locateBtn}
            activeOpacity={0.8}
          >
            <Crosshair size={20} color="#10b981" />
          </TouchableOpacity>

          {/* Dropped pin action card */}
          {droppedPin && (
            <View style={styles.pinCard}>
              <View className="flex-row items-center mb-3">
                <MapPin size={16} color="#10b981" />
                <Text
                  className="text-sm font-semibold text-slate-800 ml-2 flex-1"
                  numberOfLines={2}
                >
                  {reversingGeo
                    ? "Getting address…"
                    : droppedPin.address || "Dropped pin"}
                </Text>
                <TouchableOpacity
                  onPress={() => setDroppedPin(null)}
                  className="p-1"
                >
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: "#2D8A4E", flex: 1 }]}
                  onPress={handleRecordSaleHere}
                  disabled={reversingGeo || !!submitting}
                  activeOpacity={0.8}
                >
                  <DollarSign size={14} color="#fff" />
                  <Text style={styles.quickBtnText}>Sale</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: "#6c757d", flex: 1 }]}
                  onPress={() => handleQuickRecord("no_answer")}
                  disabled={reversingGeo || !!submitting}
                  activeOpacity={0.8}
                >
                  {submitting === "no_answer" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <HelpCircle size={14} color="#fff" />
                      <Text style={styles.quickBtnText}>No Answer</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: "#1a1a1a", flex: 1 }]}
                  onPress={() => handleQuickRecord("do_not_knock")}
                  disabled={reversingGeo || !!submitting}
                  activeOpacity={0.8}
                >
                  {submitting === "do_not_knock" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ban size={14} color="#fff" />
                      <Text style={styles.quickBtnText}>Do Not Knock</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Legend */}
          <View className="absolute bottom-4 left-4 right-4 bg-white/95 rounded-2xl px-4 py-3 shadow-sm flex-row flex-wrap justify-center gap-x-4 gap-y-1">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <View key={key} className="flex-row items-center">
                <View
                  className="w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: cfg.color }}
                />
                <Text className="text-[10px] text-slate-600">{cfg.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Detail Sheet */}
      {selectedPin && (
        <Modal transparent animationType="slide" visible>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setSelectedPin(null)}
          />
          <View className="bg-white rounded-t-3xl px-5 py-4 shadow-lg">
            <View className="flex-row items-center justify-between mb-3">
              <View
                className="rounded-full px-3 py-1"
                style={{
                  backgroundColor:
                    (STATUS_CFG[selectedPin.doorStatus]?.color || "#64748b") +
                    "18",
                }}
              >
                <Text
                  style={{ color: STATUS_CFG[selectedPin.doorStatus]?.color }}
                  className="text-xs font-bold"
                >
                  {STATUS_CFG[selectedPin.doorStatus]?.symbol}{" "}
                  {STATUS_CFG[selectedPin.doorStatus]?.label}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPin(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedPin.name ? (
              <Text className="text-base font-semibold text-slate-800">
                {selectedPin.name}
              </Text>
            ) : null}

            {selectedPin.address ? (
              <View className="flex-row items-center mt-1">
                <MapPin size={13} color="#94a3b8" />
                <Text className="text-sm text-slate-500 ml-1">
                  {selectedPin.address}
                </Text>
              </View>
            ) : null}

            {selectedPin.doorStatus === "sale_made" &&
              selectedPin.price != null && (
                <View className="flex-row items-center mt-1">
                  <DollarSign size={13} color="#2D8A4E" />
                  <Text className="text-sm font-semibold text-emerald-700 ml-1">
                    {selectedPin.formattedPrice ||
                      fmtCurrency(selectedPin.price)}
                  </Text>
                </View>
              )}

            {selectedPin.details ? (
              <Text className="text-sm text-slate-400 mt-2">
                {selectedPin.details}
              </Text>
            ) : null}

            {selectedPin.salesRepName ? (
              <Text className="text-xs text-slate-400 mt-2">
                Rep: {selectedPin.salesRepName}
              </Text>
            ) : null}

            <View className="h-6" />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  locateBtn: {
    position: "absolute",
    bottom: 70,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 4,
    gap: 4,
  },
  quickBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 11,
  },
  pinCard: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
});
