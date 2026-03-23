import { useMemo } from "react";

export interface SessionParams {
  pid: string;
  uid: string;
  ip: string;
  entryTime: string;
  exitTime: string;
  duration: string;
  loiMinutes: string;
  currentTime: string;
  reason: string;
  country: string;
  status: string;
  rawStart: string | null;
  rawEnd: string | null;
  timestamp: string;
  session: string;
  start: string;
  end: string;
  loi: string;
}

export function formatTimestamp(unix: string | null): string {
  if (!unix) return "-";
  try {
    const date = new Date(parseInt(unix) * 1000);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: true, timeZoneName: "short"
    }).replace(",", "");
  } catch { return "-"; }
}

export function calculateDuration(start: string | null, end: string | null) {
  if (!start || !end) return { loi: "-", duration: "-" };
  try {
    const diffSeconds = parseInt(end) - parseInt(start);
    if (isNaN(diffSeconds) || diffSeconds < 0) return { loi: "-", duration: "-" };
    const minutes = Math.floor(diffSeconds / 60);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return {
      loi: minutes.toString(),
      duration: hrs > 0 ? `${hrs} hr ${mins} min` : `${minutes} minutes`
    };
  } catch { return { loi: "-", duration: "-" }; }
}

export function getSessionParams(search: string): SessionParams {
  const p = new URLSearchParams(search);
  const startRaw = p.get("start");
  const endRaw = p.get("end");
  const loiParam = p.get("loi");
  const { loi: calcLoi, duration: calcDuration } = calculateDuration(startRaw, endRaw);
  const loiMinutes = loiParam || calcLoi;
  let duration = calcDuration;
  if (loiParam) {
    const m = parseInt(loiParam);
    if (!isNaN(m)) {
      const h = Math.floor(m / 60); const min = m % 60;
      duration = h > 0 ? `${h} hr ${min} min` : `${m} minutes`;
    }
  }
  const currentTime = new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true, timeZoneName: "short"
  }).replace(",", "");
  return {
    pid: p.get("pid") || "-", uid: p.get("uid") || "-", ip: p.get("ip") || "-",
    entryTime: formatTimestamp(startRaw), exitTime: formatTimestamp(endRaw),
    duration, loiMinutes, currentTime, reason: p.get("reason") || "-",
    country: p.get("country") || "-", status: p.get("status") || "-",
    rawStart: startRaw, rawEnd: endRaw, start: formatTimestamp(startRaw),
    end: formatTimestamp(endRaw), loi: loiMinutes, timestamp: currentTime,
    session: p.get("session") || p.get("oi_session") || "-",
  };
}

export function useSessionParams(): SessionParams {
  const params = useMemo(() => {
    if (typeof window === "undefined") return getSessionParams("");
    return getSessionParams(window.location.search);
  }, []);
  return params;
}
