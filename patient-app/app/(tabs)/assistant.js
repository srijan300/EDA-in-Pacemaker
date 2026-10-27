// This route is no longer used for direct navigation — the Heart Assistant
// now lives in a global right-side drawer (src/components/AssistantDrawer.js)
// opened via the bottom tab, the dashboard card, or an edge swipe. This file
// stays only as a safety net: if anything still lands on /assistant (e.g. a
// stale deep link), it opens the drawer over Home instead of showing a dead
// screen.
import { useEffect } from "react";
import { router } from "expo-router";
import { useAssistant } from "../../src/context/AssistantContext";

export default function AssistantRedirect() {
  const { openAssistant } = useAssistant();

  useEffect(() => {
    openAssistant();
    router.replace("/");
  }, []);

  return null;
}
