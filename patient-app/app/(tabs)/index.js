// Patient dashboard: shows the prescribed voltage, device/sync status, a
// live pulse reading, and a manual "Sync now" button. Runs the sync cycle
// automatically every 30 min while the app is foregrounded, and registers a
// background task for when it's not.
import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { api } from "../../src/api/client";
import { runSyncCycle } from "../../src/pacemaker/sync";
import { registerBackgroundSync, SYNC_INTERVAL_SECONDS } from "../../src/pacemaker/background";
import { PACEMAKER_MODE } from "../../src/pacemaker";
import { PulseStrip, LiveDot } from "../../src/components/PulseStrip";
import { theme } from "../../src/lib/theme";
import { s } from "../../src/lib/ui";

const INTERVAL_MS = SYNC_INTERVAL_SECONDS * 1000;
const LINK_LABEL =
  PACEMAKER_MODE === "ble" ? "BLE" : PACEMAKER_MODE === "network" ? "Network simulator" : "In-app simulated";

export default function Dashboard() {
  const { patient, setPatient } = useAuth();
  const [voltage, setVoltage] = useState(patient?.current_voltage ?? null);
  const [target, setTarget] = useState(patient?.target_voltage ?? null);
  const [latestBpm, setLatestBpm] = useState(null);
  const [status, setStatus] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(INTERVAL_MS);
  const nextRef = useRef(Date.now() + INTERVAL_MS);

  async function refreshVoltage() {
    try {
      const v = await api.getVoltage();
      setVoltage(v.current_voltage);
      setTarget(v.target_voltage);
    } catch (_) {}
  }

  async function refreshLatestReading() {
    try {
      const res = await api.getHeartRateHistory(7);
      if (res.readings?.length) setLatestBpm(res.readings[0].bpm);
    } catch (_) {}
  }

  async function doSync() {
    if (busy) return;
    setBusy(true);
    setStatus("Starting sync…");
    const result = await runSyncCycle({ onStep: setStatus });
    if (result.ok) {
      const conn = result.connectionMs != null ? ` · connected ${result.connectionMs}ms then isolated` : "";
      setStatus(
        `Synced · voltage ${result.voltageWritten} V · ${result.readingsUploaded} readings uploaded${conn}`
      );
      setLastSync(new Date());
      await refreshVoltage();
      await refreshLatestReading();
      try {
        const me = await api.me();
        setPatient(me.patient);
      } catch (_) {}
    } else {
      setStatus(`Sync failed: ${result.error}`);
    }
    nextRef.current = Date.now() + INTERVAL_MS;
    setBusy(false);
  }

  // Initial load + register background task.
  useEffect(() => {
    refreshVoltage();
    refreshLatestReading();
    registerBackgroundSync();
  }, []);

  // Foreground 30-min auto-sync + 1s countdown.
  useEffect(() => {
    const tick = setInterval(() => {
      const ms = Math.max(0, nextRef.current - Date.now());
      setCountdown(ms);
      if (ms <= 0 && !busy) doSync();
    }, 1000);
    return () => clearInterval(tick);
  }, [busy]);

  const mm = String(Math.floor(countdown / 60000)).padStart(2, "0");
  const ss = String(Math.floor((countdown % 60000) / 1000)).padStart(2, "0");
  const pending = target != null && voltage != null && Math.abs(target - voltage) > 1e-9;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            refreshVoltage();
            refreshLatestReading();
          }}
          tintColor={theme.pulse}
        />
      }
    >
      <Text style={s.eyebrow}>Good to see you</Text>
      <Text style={[s.h1, { marginBottom: 4 }]}>{patient?.full_name || "Patient"}</Text>
      <View style={[s.pill, { marginBottom: 20 }]}>
        <Ionicons name="hardware-chip-outline" size={13} color={theme.textLo} />
        <Text style={s.pillText}>
          {patient?.pacemaker_serial || "—"} · {LINK_LABEL}
        </Text>
      </View>

      {/* Signature hero: live pulse strip, driven by the latest real reading */}
      <View style={[s.card, { paddingBottom: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <LiveDot bpm={latestBpm} />
          <Text style={s.label}>{latestBpm ? "Latest heart rate" : "Heart rate"}</Text>
        </View>
        <Text style={{ color: theme.text, fontSize: 44, fontWeight: "700", letterSpacing: -1 }}>
          {latestBpm ?? "—"} <Text style={{ fontSize: 16, color: theme.textLo, fontWeight: "500" }}>bpm</Text>
        </Text>
        <PulseStrip bpm={latestBpm} style={{ marginTop: 6 }} />
      </View>

      {/* Voltage card */}
      <View style={s.card}>
        <Text style={s.label}>Pacemaker voltage (on device)</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <Text style={{ color: theme.accent, fontSize: 40, fontWeight: "700", letterSpacing: -1 }}>
            {voltage ?? "—"}
          </Text>
          <Text style={{ color: theme.textLo, fontSize: 18, marginBottom: 6 }}>V</Text>
        </View>
        {pending ? (
          <Text style={{ color: theme.warn, fontSize: 13 }}>
            New prescription {target} V — will apply on next sync.
          </Text>
        ) : (
          <Text style={{ color: theme.ok, fontSize: 13 }}>Up to date ✓</Text>
        )}
      </View>

      {/* Sync card */}
      <View style={s.card}>
        <Text style={s.label}>Sync</Text>
        <Text style={{ color: theme.text, fontSize: 15, marginBottom: 4 }}>
          Next auto-sync in {mm}:{ss}
        </Text>
        <Text style={{ color: theme.textLo, fontSize: 13 }}>
          {lastSync ? `Last sync ${lastSync.toLocaleTimeString()}` : "No sync yet this session"}
        </Text>
        {status ? (
          <Text style={{ color: theme.accent, fontSize: 13, marginTop: 10 }}>{status}</Text>
        ) : null}

        <TouchableOpacity style={s.btn} onPress={doSync} disabled={busy}>
          <Text style={s.btnText}>{busy ? "Syncing…" : "Sync now"}</Text>
        </TouchableOpacity>
      </View>

      {/* Quick links to the two new tabs */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <TouchableOpacity
          style={[s.card, { flex: 1, marginBottom: 0, alignItems: "flex-start" }]}
          onPress={() => router.push("/readings")}
        >
          <Ionicons name="pulse" size={20} color={theme.pulse} />
          <Text style={{ color: theme.text, fontWeight: "700", marginTop: 8 }}>Readings</Text>
          <Text style={{ color: theme.textLo, fontSize: 12, marginTop: 2 }}>Full history & trend</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: theme.textFaint, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
        Every 30 minutes this app sends your prescribed voltage to your pacemaker
        and uploads your heart-rate data for your care team. Keep Bluetooth on
        and stay near your device during sync.
      </Text>
    </ScrollView>
  );
}
