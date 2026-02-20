import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getApiErrorMessage } from "@/lib/api";
import { sessionStore } from "@/lib/session";
import { ComplaintRecord, getComplaints } from "@/lib/services/complaints";
import {
  MunicipalOffice,
  getMunicipalOffices,
} from "@/lib/services/municipalOffices";

type LatLng = { latitude: number; longitude: number };
type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

type MapItem = {
  id: string;
  type: "complaint" | "office";
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  status?: string;
  priority?: string;
  category?: string;
};

const DEFAULT_REGION: MapRegion = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 60,
  longitudeDelta: 60,
};

const priorityColor = (level?: string) => {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#10b981";
};

const toLatLng = (coords?: [number, number]): LatLng | null => {
  if (!coords || coords.length !== 2) {
    return null;
  }
  const [longitude, latitude] = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
};

const buildRegionFromPoints = (
  points: LatLng[],
  fallback?: LatLng
): MapRegion => {
  if (points.length === 0) {
    if (fallback) {
      return {
        latitude: fallback.latitude,
        longitude: fallback.longitude,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      };
    }
    return DEFAULT_REGION;
  }

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  points.forEach((point) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max(0.02, (maxLat - minLat) * 1.8);
  const longitudeDelta = Math.max(0.02, (maxLng - minLng) * 1.8);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
};

export default function CityMapWeb() {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [offices, setOffices] = useState<MunicipalOffice[]>([]);
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);

  const loadData = useCallback(async () => {
    if (!sessionStore.getAccessToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [complaintData, officeData] = await Promise.all([
        getComplaints(),
        getMunicipalOffices(),
      ]);

      setComplaints(complaintData);
      setOffices(officeData);
    } catch (error) {
      Alert.alert("Map error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const complaintMarkers = useMemo<MapItem[]>(() => {
    return complaints
      .map((item) => {
        const coords = toLatLng(item.location?.coordinates);
        if (!coords) {
          return null;
        }
        return {
          id: item._id,
          type: "complaint",
          title: item.title,
          subtitle: item.status.replace("_", " "),
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: item.status,
          priority: item.priority?.level,
          category: item.category,
        };
      })
      .filter((item): item is MapItem => !!item);
  }, [complaints]);

  const officeMarkers = useMemo<MapItem[]>(() => {
    return offices
      .map((office) => {
        const coords = toLatLng(office.location?.coordinates);
        if (!coords) {
          return null;
        }
        return {
          id: office._id,
          type: "office",
          title: office.name,
          subtitle: `Zone ${office.zone}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status: office.isActive ? "active" : "inactive",
        };
      })
      .filter((item): item is MapItem => !!item);
  }, [offices]);

  const visibleMarkers = useMemo(
    () => [...complaintMarkers, ...officeMarkers],
    [complaintMarkers, officeMarkers]
  );

  const markerPoints = useMemo(() => {
    return visibleMarkers.map((item) => ({
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  }, [visibleMarkers]);

  const webBounds = useMemo(
    () => buildRegionFromPoints(markerPoints),
    [markerPoints]
  );

  const stats = useMemo(() => {
    const high = complaintMarkers.filter((item) => item.priority === "high").length;
    const medium = complaintMarkers.filter((item) => item.priority === "medium").length;
    const low = complaintMarkers.filter(
      (item) => !item.priority || item.priority === "low"
    ).length;
    return {
      high,
      medium,
      low,
      total: complaintMarkers.length,
      offices: officeMarkers.length,
    };
  }, [complaintMarkers, officeMarkers]);

  if (!sessionStore.getAccessToken()) {
    return (
      <LinearGradient colors={["#f1f6fc", "#e0eaff"]} style={styles.container}>
        <View style={styles.centerState}>
          <Ionicons name="lock-closed" size={48} color="#1e3a8a" />
          <Text style={styles.centerTitle}>Login Required</Text>
          <Text style={styles.centerText}>Please login to view city map insights.</Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.ctaText}>Go to Login</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={["#f1f6fc", "#e0eaff"]} style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.centerText}>Loading map data...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#eef2ff", "#e0e7ff"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#1e3a8a" />
          </Pressable>
          <Text style={styles.title}>City Map</Text>
          <Pressable onPress={() => void loadData()}>
            <Ionicons name="refresh" size={24} color="#1e3a8a" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>Complaints</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.offices}</Text>
            <Text style={styles.summaryLabel}>Offices</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.high}</Text>
            <Text style={styles.summaryLabel}>High priority</Text>
          </View>
        </View>

        <View style={styles.webMap}>
          <View style={styles.webGrid} />
          {visibleMarkers.map((item) => {
            const x =
              (item.longitude - (webBounds.longitude - webBounds.longitudeDelta / 2)) /
              webBounds.longitudeDelta;
            const y =
              1 -
              (item.latitude - (webBounds.latitude - webBounds.latitudeDelta / 2)) /
                webBounds.latitudeDelta;
            const left = Math.min(95, Math.max(5, x * 100));
            const top = Math.min(90, Math.max(10, y * 100));
            return (
              <Pressable
                key={`${item.type}-${item.id}`}
                style={[
                  styles.webMarker,
                  {
                    left: `${left}%`,
                    top: `${top}%`,
                    backgroundColor:
                      item.type === "office"
                        ? "#1e3a8a"
                        : priorityColor(item.priority),
                  },
                ]}
                onPress={() => setSelectedItem(item)}
              />
            );
          })}
          <Text style={styles.webHint}>Interactive preview on web</Text>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
            <Text style={styles.legendText}>Medium</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
            <Text style={styles.legendText}>Low</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#1e3a8a" }]} />
            <Text style={styles.legendText}>Office</Text>
          </View>
        </View>

        <View style={styles.sheetCard}>
          {selectedItem ? (
            <View>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleWrap}>
                  <Text style={styles.sheetTitle}>{selectedItem.title}</Text>
                  <Text style={styles.sheetSub}>{selectedItem.subtitle}</Text>
                </View>
                <Pressable onPress={() => setSelectedItem(null)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </Pressable>
              </View>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetMeta}>
                  {selectedItem.category || selectedItem.type}
                </Text>
                <Text style={styles.sheetMeta}>
                  {selectedItem.status?.replace("_", " ") || "active"}
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.sheetTitle}>City overview</Text>
              <Text style={styles.sheetSub}>
                Click a marker to inspect details.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Recent Complaints</Text>
          {complaintMarkers.slice(0, 8).map((item) => (
            <Pressable
              key={item.id}
              style={styles.listItem}
              onPress={() => setSelectedItem(item)}
            >
              <View style={[styles.dot, { backgroundColor: priorityColor(item.priority) }]} />
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listSub}>{item.subtitle}</Text>
              </View>
            </Pressable>
          ))}
          {complaintMarkers.length === 0 ? (
            <Text style={styles.emptyText}>No complaints found.</Text>
          ) : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  centerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  centerText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e3a8a",
    flex: 1,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    borderColor: "#dbeafe",
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748b",
  },
  webMap: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    height: 320,
    backgroundColor: "#e0e7ff",
  },
  webGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  webMarker: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  webHint: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(15,23,42,0.65)",
    color: "#fff",
    fontSize: 11,
  },
  legend: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  sheetCard: {
    marginHorizontal: 20,
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  sheetSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  sheetRow: {
    flexDirection: "row",
    gap: 12,
  },
  sheetMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  listSection: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderColor: "#dbeafe",
    borderWidth: 1,
  },
  listBody: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  listSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
  },
});
