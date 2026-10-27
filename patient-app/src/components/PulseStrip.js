// PulseStrip — the app's signature visual: a scrolling ECG-style waveform
// built from plain Views (no SVG/chart dependency needed). It isn't just
// decoration — the scroll speed is derived from the actual bpm passed in,
// so a higher heart rate visibly moves faster. When bpm is unknown it falls
// back to a calm idle sweep instead of guessing.
import { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import { theme } from "../lib/theme";

// One QRS-complex-shaped "beat" as a sequence of bar heights (0-1 scale).
// Repeated to fill the strip: flat baseline, small P bump, sharp spike down/up
// (QRS), small T bump, back to baseline.
const BEAT = [
  0.12, 0.12, 0.12, 0.22, 0.3, 0.22, 0.12, 0.12,
  0.05, 0.85, 0.15, 0.4, 0.28, 0.16, 0.12, 0.12, 0.12,
];

function buildBars(beats = 4) {
  const bars = [];
  for (let i = 0; i < beats; i++) bars.push(...BEAT);
  return bars;
}

export function PulseStrip({ bpm, height = 56, color = theme.pulse, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const bars = buildBars(6);
  const barWidth = 4;
  const gap = 3;
  const stripWidth = bars.length * (barWidth + gap);

  useEffect(() => {
    // Faster heart rate -> faster scroll. 60bpm ~= 3.2s per beat cycle;
    // scale relative to that so the motion reads as tied to the number above it.
    const beatMs = bpm && bpm > 0 ? (60000 / bpm) * BEAT.length * 0.9 : 900;
    const durationMs = beatMs * 6; // matches the 6 repeated beats in the strip

    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [bpm]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(stripWidth / 6)], // scroll exactly one beat-width per loop
  });

  return (
    <View style={[{ height, overflow: "hidden", width: "100%" }, style]}>
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height,
          width: stripWidth * 2,
          transform: [{ translateX }],
        }}
      >
        {[...bars, ...bars].map((h, i) => (
          <View
            key={i}
            style={{
              width: barWidth,
              marginRight: gap,
              height: Math.max(2, h * height),
              borderRadius: barWidth / 2,
              backgroundColor: color,
              opacity: 0.15 + h * 0.85,
            }}
          />
        ))}
      </Animated.View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: "transparent" }} />
      </View>
    </View>
  );
}

// A small breathing dot that flashes once per real heartbeat — used next to
// "live" labels (e.g. the dashboard header) as a quiet, literal indicator.
export function LiveDot({ bpm, color = theme.pulse, size = 8 }) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const intervalMs = bpm && bpm > 0 ? 60000 / bpm : 1000;
    anim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.25,
          duration: Math.min(220, intervalMs * 0.3),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: Math.max(60, intervalMs * 0.7),
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bpm]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim,
      }}
    />
  );
}
