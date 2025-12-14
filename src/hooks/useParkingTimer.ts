import { useState, useEffect } from "react";
import { useParkingStore } from "../state/parkingStore";

export function useParkingTimer() {
  const activeSession = useParkingStore((state) => state.activeSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const startTimeStr = activeSession.adjustedStartedAt || activeSession.startedAt;
    const startTime = new Date(startTimeStr).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    totalSeconds: elapsedSeconds,
  };
}

