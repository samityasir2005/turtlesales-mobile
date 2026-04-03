import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DollarSign,
  Check,
  Search,
  MapPin,
  Clock,
  Users,
  X,
  HelpCircle,
  DoorOpen,
} from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useCreateSale, useWorkdays } from "../../hooks/useApi";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// ── Door status options ──────────────────────────────────────────────
const DOOR_STATUSES = [
  {
    key: "sale_made",
    label: "Sale Made",
    desc: "Closed deal — requires details",
    color: "#2D8A4E",
    Icon: DollarSign,
  },
  {
    key: "no_answer",
    label: "No Answer",
    desc: "Nobody home — pin the door",
    color: "#6c757d",
    Icon: HelpCircle,
  },
  {
    key: "not_interested",
    label: "Not Interested",
    desc: "Hard no — pin the door",
    color: "#dc3545",
    Icon: X,
  },
];

// ── Dynamic Yup schema based on door status ─────────────────────────
const getSchema = (status) =>
  yup.object().shape({
    name:
      status === "sale_made"
        ? yup.string().required("Name is required").min(2).max(100)
        : yup.string().max(100).notRequired(),
    address: yup.string().required("Address is required").min(3).max(300),
    number:
      status === "sale_made"
        ? yup
            .string()
            .required("Phone is required")
            .matches(/^\+?[\d\s\-()]+$/, "Invalid phone")
        : yup.string().notRequired(),
    price:
      status === "sale_made"
        ? yup
            .number()
            .required("Price is required")
            .min(0.01)
            .max(999999.99)
            .typeError("Enter a number")
        : yup.mixed().notRequired(),
    details:
      status === "sale_made"
        ? yup.string().required("Details are required").max(500)
        : yup.string().max(500).notRequired(),
  });

// ── Phone auto-format ────────────────────────────────────────────────
const fmtPhone = (v) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export default function RecordDoorScreen({ route }) {
  // Accept pre-filled address/coords from MapScreen
  const prefilled = route?.params || {};

  const [status, setStatus] = useState(null);
  const [coords, setCoords] = useState(
    prefilled.lat && prefilled.lng
      ? { lat: prefilled.lat, lng: prefilled.lng }
      : null,
  );
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);
  const searchTimer = useRef(null);
  const createSale = useCreateSale();

  // Fetch today's workdays to get timeslots
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const { data: workdays, isLoading: timeslotsLoading } = useWorkdays({
    startDate: todayStart.toISOString(),
    endDate: todayEnd.toISOString(),
  });

  // Get available timeslots from today's workdays
  const availableTimeslots = useMemo(() => {
    const raw = Array.isArray(workdays) ? workdays : [];
    const slots = [];
    raw.forEach((wd) => {
      (wd.timeslots || []).forEach((slot) => {
        const assignedCount = Array.isArray(slot.assignedUsers)
          ? slot.assignedUsers.length
          : 0;
        const recordedCount = slot.salesCount || slot.sales?.length || 0;
        slots.push({
          ...slot,
          workdayId: wd._id,
          assignedCount,
          recordedCount,
          canRecord: assignedCount > 0,
        });
      });
    });
    return slots.sort((left, right) =>
      String(left.startTime || "").localeCompare(String(right.startTime || "")),
    );
  }, [workdays]);

  const to12h = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  // Schema changes when status changes — we validate manually
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getSchema(status)),
    defaultValues: {
      name: "",
      address: prefilled.address || "",
      number: "",
      price: "",
      details: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (prefilled.address) {
      setValue("address", prefilled.address, { shouldValidate: true });
    }

    if (Number.isFinite(prefilled.lat) && Number.isFinite(prefilled.lng)) {
      setCoords({ lat: prefilled.lat, lng: prefilled.lng });
    }
  }, [prefilled.address, prefilled.lat, prefilled.lng, setValue]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // ── Mapbox forward geocode (autocomplete) ──
  const searchAddress = useCallback(async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=ca,us&limit=5&types=address,poi`;
      const res = await fetch(url);
      const json = await res.json();
      setSuggestions(json.features || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text, onChange) => {
      onChange(text);
      setCoords(null);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => searchAddress(text), 350);
    },
    [searchAddress],
  );

  const handleSelectSuggestion = useCallback(
    (feature) => {
      const placeName = feature.place_name;
      const [lng, lat] = feature.center;
      setValue("address", placeName, { shouldValidate: true });
      setCoords({ lat, lng });
      setSuggestions([]);
    },
    [setValue],
  );

  const geocodeAddress = useCallback(async (address) => {
    if (!address?.trim()) return null;

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&country=ca,us&limit=1&types=address,poi`;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json.features?.[0];

      if (!feature?.center || feature.center.length < 2) return null;

      const [lng, lat] = feature.center;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return { lat, lng };
    } catch {
      return null;
    }
  }, []);

  const onSubmit = async (formData) => {
    if (!status) {
      Toast.show({
        type: "error",
        text1: "Door Status Required",
        text2: "Select a door status before submitting.",
      });
      return;
    }

    if (status === "sale_made" && !selectedTimeslot) {
      Toast.show({
        type: "error",
        text1: "Timeslot Required",
        text2: "Please select a timeslot to record this door.",
      });
      return;
    }

    let resolvedCoords = coords;
    if (!resolvedCoords) {
      resolvedCoords = await geocodeAddress(formData.address);
      if (resolvedCoords) {
        setCoords(resolvedCoords);
      }
    }

    if (!resolvedCoords) {
      Toast.show({
        type: "error",
        text1: "Map Pin Required",
        text2:
          "Choose a valid address suggestion or drop a pin so this door appears on the web map.",
      });
      return;
    }

    const trimmedName = formData.name?.trim();
    const trimmedNumber = formData.number?.trim();
    const trimmedDetails = formData.details?.trim();

    const payload = {
      doorStatus: status,
      address: formData.address.trim(),
      coordinates: resolvedCoords,
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(trimmedNumber ? { number: trimmedNumber } : {}),
      ...(trimmedDetails ? { details: trimmedDetails } : {}),
      ...(status === "sale_made"
        ? {
            name: trimmedName,
            number: trimmedNumber,
            price: parseFloat(formData.price),
            details: trimmedDetails,
            workdayId: selectedTimeslot.workdayId,
            timeslotId: selectedTimeslot._id,
          }
        : {}),
    };

    createSale.mutate(payload, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: "Recorded",
          text2: "Door record saved successfully.",
        });
        setStatus(null);
        setCoords(null);
        setSuggestions([]);
        setSelectedTimeslot(null);
        reset({
          name: "",
          address: prefilled.address || "",
          number: "",
          price: "",
          details: "",
        });
      },
    });
  };

  const handleReset = () => {
    setStatus(null);
    setCoords(null);
    setSelectedTimeslot(null);
    setSuggestions([]);
    reset({
      name: "",
      address: prefilled.address || "",
      number: "",
      price: "",
      details: "",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-4 pt-4 pb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                <DoorOpen size={20} color="#10b981" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-slate-800">
                  Record Door
                </Text>
                <Text className="text-sm text-slate-500 mt-0.5">
                  Log a door-to-door visit
                </Text>
              </View>
            </View>
          </View>

          {/* Status selection */}
          <View className="px-4 mt-2">
            <Text className="text-xs font-semibold text-slate-500 uppercase mb-3">
              Door Status
            </Text>
            {DOOR_STATUSES.map((s) => {
              const active = status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  className={`flex-row items-center rounded-2xl p-4 mb-2 ${
                    active ? "border-2" : "border border-slate-200 bg-white"
                  }`}
                  style={
                    active
                      ? {
                          borderColor: s.color,
                          backgroundColor: s.color + "10",
                        }
                      : undefined
                  }
                  onPress={() => setStatus(s.key)}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: s.color + "18" }}
                  >
                    <s.Icon size={18} color={s.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-800">
                      {s.label}
                    </Text>
                    <Text className="text-xs text-slate-400">{s.desc}</Text>
                  </View>
                  {active && (
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: s.color }}
                    >
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form fields (only after selecting status) */}
          {status && (
            <View className="px-4 mt-4">
              <Text className="text-xs font-semibold text-slate-500 uppercase mb-3">
                Details
              </Text>

              {status === "sale_made" && (
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-slate-700 mb-1">
                    Customer Name *
                  </Text>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
                        placeholder="Enter customer name"
                        placeholderTextColor="#94a3b8"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                  {errors.name && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </Text>
                  )}
                </View>
              )}

              {/* Address (search with autocomplete) */}
              <View className="mb-3">
                <Text className="text-sm font-semibold text-slate-700 mb-1">
                  Address *
                </Text>
                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <View className="relative">
                        <TextInput
                          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 pr-10"
                          placeholder="Search for an address…"
                          placeholderTextColor="#94a3b8"
                          value={value}
                          onBlur={onBlur}
                          onChangeText={(text) =>
                            handleSearchChange(text, onChange)
                          }
                          autoCorrect={false}
                        />
                        {searching ? (
                          <View className="absolute right-3 top-3.5">
                            <ActivityIndicator size="small" color="#10b981" />
                          </View>
                        ) : (
                          <View className="absolute right-3 top-3.5">
                            <Search size={16} color="#94a3b8" />
                          </View>
                        )}
                      </View>
                      {suggestions.length > 0 && (
                        <View className="bg-white border border-slate-200 rounded-xl mt-1 overflow-hidden">
                          {suggestions.map((s, idx) => (
                            <TouchableOpacity
                              key={s.id || idx}
                              className={`flex-row items-center px-4 py-3 ${
                                idx < suggestions.length - 1
                                  ? "border-b border-slate-100"
                                  : ""
                              }`}
                              onPress={() => handleSelectSuggestion(s)}
                              activeOpacity={0.7}
                            >
                              <MapPin size={14} color="#94a3b8" />
                              <Text
                                className="text-sm text-slate-700 ml-2 flex-1"
                                numberOfLines={2}
                              >
                                {s.place_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                />
                {coords && (
                  <View className="flex-row items-center mt-1.5">
                    <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                    <Text className="text-xs text-emerald-600">
                      Location pinned
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-slate-400 mt-1">
                  Use a suggestion or map pin so the record appears on the
                  shared web map.
                </Text>
                {errors.address && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors.address.message}
                  </Text>
                )}
              </View>

              {/* Phone (sale_made only) */}
              {status === "sale_made" && (
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-slate-700 mb-1">
                    Phone *
                  </Text>
                  <Controller
                    control={control}
                    name="number"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
                        placeholder="(555) 123-4567"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        onBlur={onBlur}
                        onChangeText={(v) => onChange(fmtPhone(v))}
                        value={value}
                      />
                    )}
                  />
                  {errors.number && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.number.message}
                    </Text>
                  )}
                </View>
              )}

              {/* Sale Price (sale_made only) */}
              {status === "sale_made" && (
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-slate-700 mb-1">
                    Sale Price ($) *
                  </Text>
                  <Controller
                    control={control}
                    name="price"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="decimal-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value?.toString()}
                      />
                    )}
                  />
                  {errors.price && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.price.message}
                    </Text>
                  )}
                </View>
              )}

              {status === "sale_made" && (
                <View className="mb-3">
                  <Text className="text-sm font-semibold text-slate-700 mb-1">
                    Timeslot *
                  </Text>
                  {timeslotsLoading ? (
                    <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text className="text-sm text-slate-400 ml-2">
                        Loading timeslots…
                      </Text>
                    </View>
                  ) : availableTimeslots.length === 0 ? (
                    <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <Text className="text-sm text-amber-700">
                        No available timeslots today. All slots are full or none
                        have been created yet.
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {availableTimeslots.map((slot) => {
                        const isSelected = selectedTimeslot?._id === slot._id;
                        const isDisabled = !slot.canRecord;

                        return (
                          <TouchableOpacity
                            key={slot._id}
                            className={`flex-row items-center rounded-xl p-3 mb-2 ${
                              isSelected
                                ? "border-2 border-emerald-500 bg-emerald-50"
                                : "border border-slate-200 bg-white"
                            } ${isDisabled ? "opacity-60" : ""}`}
                            onPress={() => {
                              if (!isDisabled) setSelectedTimeslot(slot);
                            }}
                            disabled={isDisabled}
                            activeOpacity={0.7}
                          >
                            <View className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-3">
                              <Clock
                                size={16}
                                color={isSelected ? "#10b981" : "#64748b"}
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-slate-800">
                                {to12h(slot.startTime)} – {to12h(slot.endTime)}
                              </Text>
                              <View className="flex-row items-center mt-0.5">
                                <Users size={11} color="#94a3b8" />
                                <Text className="text-xs text-slate-500 ml-1">
                                  {slot.assignedCount} assigned · {slot.recordedCount} recorded
                                </Text>
                              </View>
                              {isDisabled && (
                                <Text className="text-xs text-amber-600 mt-0.5">
                                  Assign at least one cleaner before recording doors.
                                </Text>
                              )}
                            </View>
                            {isSelected && (
                              <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                                <Check size={14} color="#fff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Details / Notes */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-slate-700 mb-1">
                  Notes {status === "sale_made" ? "*" : "(optional)"}
                </Text>
                <Controller
                  control={control}
                  name="details"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
                      placeholder="Additional details…"
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={{ minHeight: 64 }}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.details && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors.details.message}
                  </Text>
                )}
              </View>

              {/* Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center"
                  onPress={handleReset}
                >
                  <Text className="text-slate-600 font-semibold">Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3.5 rounded-xl bg-emerald-500 items-center"
                  onPress={handleSubmit(onSubmit)}
                  disabled={createSale.isPending}
                  activeOpacity={0.8}
                >
                  {createSale.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold">Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
