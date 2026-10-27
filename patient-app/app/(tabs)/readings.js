// Readings tab — the patient's own heart-rate history: summary stats, a
// quick trend chart, and the full list. This is the missing piece that lets
// the patient actually see what's been uploaded, not just trigger a sync.
import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../src/api/client";
import { theme } from "../../src/lib/theme";
import { s } from "../../src/lib/ui";

function bpmColor(bpm) {
  if (bpm == null) return theme.textLo;
  if (bpm < 50 || bpm > 110) return theme.alert;
  if (bpm < 60 || bpm > 100) return theme.warn;
  return theme.ok;
}

// Small static trend chart built from plain Views — bar heights normalized
// against the visible range so day-to-day variation is easy to read at a
// glance, oldest to newest left-to-right.
function TrendChart({ readings }) {
  if (!readings.length) return null;
  const ordered = [...readings].reverse().slice(-24); // oldest -> newest, cap 24 bars
  const values = ordered.map((r) => r.bpm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const height = 72;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 3 }}>
      {ordered.map((r, i) => {
        const ratio = (r.bpm - min) / span;
        const barHeight = Math.max(4, 10 + ratio * (height - 10));
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: barHeight,
              borderRadius: 3,
              backgroundColor: bpmColor(r.bpm),
              opacity: 0.55 + ratio * 0.45,
            }}
          />
        );
      })}
    </View>
  );
}

export default function Readings() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await api.getHeartRateHistory(30);
      setData(res);
    } catch (e) {
      setError(e.message || "Couldn't load your readings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  if (loading) {
    return (
      <View style={[s.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.pulse} size="large" />
      </View>
    );
  }

  const readings = data?.readings || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.pulse} />
      }
    >
      <Text style={s.eyebrow}>Last 30 days</Text>
      <Text style={[s.h1, { marginBottom: 20 }]}>Your readings</Text>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {!error && readings.length === 0 ? (
        <View style={s.card}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600", marginBottom: 6 }}>
            Nothing uploaded yet
          </Text>
          <Text style={{ color: theme.textLo, fontSize: 13.5, lineHeight: 19 }}>
            Readings show up here after your first sync. Head to Home and tap
            "Sync now", or wait for the next automatic sync.
          </Text>
        </View>
      ) : null}

      {readings.length > 0 && (
        <>
          <View style={s.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <View>
                <Text style={s.label}>Average</Text>
                <Text style={{ color: theme.text, fontSize: 26, fontWeight: "700" }}>
                  {data.avg_bpm ?? "—"} <Text style={{ fontSize: 13, color: theme.textLo }}>bpm</Text>
                </Text>
              </View>
              <View>
                <Text style={s.label}>Low</Text>
                <Text style={{ color: bpmColor(data.min_bpm), fontSize: 26, fontWeight: "700" }}>
                  {data.min_bpm ?? "—"}
                </Text>
              </View>
              <View>
                <Text style={s.label}>High</Text>
                <Text style={{ color: bpmColor(data.max_bpm), fontSize: 26, fontWeight: "700" }}>
                  {data.max_bpm ?? "—"}
                </Text>
              </View>
            </View>
            <TrendChart readings={readings} />
            <Text style={{ color: theme.textFaint, fontSize: 11, marginTop: 8 }}>
              {data.count} reading{data.count === 1 ? "" : "s"} · oldest → newest
            </Text>
          </View>

          <Text style={[s.label, { marginTop: 4 }]}>All readings</Text>
          <View style={s.card}>
            {readings.map((r, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.border,
                }}
              >
                <View>
                  <Text style={{ color: theme.text, fontSize: 15 }}>
                    {new Date(r.recorded_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {r.voltage != null ? (
                    <Text style={{ color: theme.textFaint, fontSize: 12, marginTop: 2 }}>
                      at {r.voltage} V
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: bpmColor(r.bpm), fontSize: 18, fontWeight: "700" }}>
                  {r.bpm} <Text style={{ fontSize: 12, fontWeight: "500" }}>bpm</Text>
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
