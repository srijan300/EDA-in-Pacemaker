// AssistantDrawer — the Heart Assistant, presented as a Copilot-style panel
// that slides in from the RIGHT edge over whatever screen you're on, rather
// than living on its own tab. Mounted once at the app root so it can be
// opened from the tab bar, the dashboard's quick-access card, or a swipe
// from the right edge — and so the conversation persists while you navigate
// underneath it. The panel's width is user-adjustable via a drag handle on
// its inner (left) edge, and the chosen width is remembered across restarts.
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { theme } from "../lib/theme";
import { s } from "../lib/ui";
import { useAssistant } from "../context/AssistantContext";
import { getAssistantWidth, saveAssistantWidth } from "../lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DEFAULT_WIDTH = Math.min(360, SCREEN_WIDTH * 0.86);
const MIN_WIDTH = 280;
const MAX_WIDTH = Math.min(560, SCREEN_WIDTH - 32);
const EDGE_ZONE = 18;
const HANDLE_WIDTH = 20;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

const SUGGESTIONS = [
  "What's a normal heart rate for me?",
  "Explain my recent readings",
  "What does my pacemaker do?",
  "I feel dizzy — what should I do?",
];

export function AssistantDrawer() {
  const { open, openAssistant, closeAssistant } = useAssistant();
  const insets = useSafeAreaInsets();

  // 0 = fully closed (off-screen right), 1 = fully open.
  const progress = useRef(new Animated.Value(0)).current;

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(width);
  const startWidthRef = useRef(width);

  // Load the last width the user dragged to, if any.
  useEffect(() => {
    (async () => {
      const saved = await getAssistantWidth();
      if (saved) {
        const clamped = clamp(saved, MIN_WIDTH, MAX_WIDTH);
        widthRef.current = clamped;
        setWidth(clamped);
      }
    })();
  }, []);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  // Slide + fade whenever `open` changes.
  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 260,
      useNativeDriver: false, // animating a layout offset, not transform/opacity alone
    }).start();
  }, [open]);

  // Drag the open panel further right (back toward the edge) to dismiss it.
  const dragPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => open && g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx > 0) progress.setValue(clamp(1 - g.dx / width, 0, 1));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > width * 0.3) {
          closeAssistant();
        } else {
          Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  // A thin invisible strip on the right screen edge: swipe left to open,
  // same gesture you'd use to reveal a Copilot-style side panel.
  const edgePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !open && g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) openAssistant();
      },
    })
  ).current;

  // Drag handle on the panel's inner edge: resize by dragging left (wider)
  // or right (narrower). Persists the final width once you let go.
  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        startWidthRef.current = widthRef.current;
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(startWidthRef.current - g.dx, MIN_WIDTH, MAX_WIDTH);
        widthRef.current = next;
        setWidth(next);
      },
      onPanResponderRelease: () => {
        saveAssistantWidth(widthRef.current);
      },
    })
  ).current;

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setError("");
    setInput("");
    const next = [...messages, { role: "user", content: question }];
    setMessages(next);
    setBusy(true);
    try {
      const history = next.slice(0, -1);
      const res = await api.askAssistant(question, history);
      setMessages((cur) => [...cur, { role: "assistant", content: res.answer }]);
    } catch (e) {
      setError(e.message || "The assistant couldn't respond.");
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  const right = progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, elevation: 50 }}
    >
      {/* Backdrop — dims the screen underneath and closes the panel on tap */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          opacity: progress,
        }}
      >
        <TouchableWithoutFeedback onPress={closeAssistant}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Edge-swipe zone to open, active only while closed */}
      {!open && (
        <View {...edgePan.panHandlers} style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: EDGE_ZONE }} />
      )}

      {/* The panel itself */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right,
          width,
          backgroundColor: theme.bg2,
          borderLeftWidth: 1,
          borderLeftColor: theme.border,
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: -8, height: 0 },
        }}
      >
        <View {...dragPan.panHandlers} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View
              style={{
                paddingTop: insets.top + 12,
                paddingHorizontal: 18,
                paddingBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <View>
                <Text style={s.eyebrow}>Ask about your heart</Text>
                <Text style={s.h2}>Heart Assistant</Text>
              </View>
              <TouchableOpacity onPress={closeAssistant} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.textLo} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 18, paddingBottom: 12 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              <View
                style={{
                  backgroundColor: theme.pulseDim,
                  borderRadius: theme.radiusSm,
                  borderWidth: 1,
                  borderColor: "rgba(255,110,110,0.3)",
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 12, lineHeight: 17 }}>
                  Informational only, not a diagnosis. It can't change your
                  pacemaker's voltage — only your doctor can. Chest pain,
                  fainting, or trouble breathing? Get emergency care now.
                </Text>
              </View>

              {messages.length === 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                  {SUGGESTIONS.map((q) => (
                    <TouchableOpacity key={q} style={s.chip} onPress={() => send(q)}>
                      <Text style={s.chipText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {messages.map((m, i) => (
                <View
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    backgroundColor: m.role === "user" ? theme.accent : theme.surfaceRaised,
                    borderRadius: theme.radiusSm,
                    borderTopRightRadius: m.role === "user" ? 4 : theme.radiusSm,
                    borderTopLeftRadius: m.role === "user" ? theme.radiusSm : 4,
                    paddingHorizontal: 13,
                    paddingVertical: 9,
                    marginBottom: 10,
                    maxWidth: "88%",
                  }}
                >
                  <Text
                    style={{
                      color: m.role === "user" ? "#131318" : theme.text,
                      fontSize: 14,
                      lineHeight: 19,
                    }}
                  >
                    {m.content}
                  </Text>
                </View>
              ))}

              {busy ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <ActivityIndicator color={theme.pulse} size="small" />
                  <Text style={{ color: theme.textLo, fontSize: 13 }}>Thinking…</Text>
                </View>
              ) : null}

              {error ? <Text style={s.error}>{error}</Text> : null}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                padding: 14,
                gap: 8,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                backgroundColor: theme.bg2,
                paddingBottom: Math.max(14, insets.bottom + 8),
              }}
            >
              <TextInput
                style={[s.input, { flex: 1, marginTop: 0 }]}
                value={input}
                onChangeText={setInput}
                placeholder="Ask a question…"
                placeholderTextColor={theme.textLo}
                onSubmitEditing={() => send()}
                returnKeyType="send"
                editable={!busy}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: theme.pulse,
                  borderRadius: theme.radiusSm,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                }}
                onPress={() => send()}
                disabled={busy || !input.trim()}
              >
                <Ionicons name="arrow-up" size={18} color="#131318" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* Resize handle — straddles the panel's left (inner) edge. Drag to
            change width; release to remember it for next time. */}
        <View
          {...resizePan.panHandlers}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: -HANDLE_WIDTH / 2,
            width: HANDLE_WIDTH,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 4,
              height: 44,
              borderRadius: 2,
              backgroundColor: theme.border,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}
