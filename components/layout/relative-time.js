"use client";

import { useEffect, useState } from "react";

const TIME_UNITS = [
  ["year", 365.25 * 24 * 60 * 60],
  ["month", 30.44 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

function formatRelativeTime(timestamp, locale) {
  const elapsedSeconds = Math.max(0, (Date.now() - timestamp) / 1000);
  const [unit, secondsPerUnit] =
    TIME_UNITS.find(([, seconds]) => elapsedSeconds >= seconds) ??
    TIME_UNITS.at(-1);
  const value = Math.round(elapsedSeconds / secondsPerUnit);

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -value,
    unit,
  );
}

export default function RelativeTime({ value }) {
  const timestamp = new Date(value).getTime();
  const [label, setLabel] = useState("");

  useEffect(() => {
    const updateLabel = () => {
      setLabel(formatRelativeTime(timestamp, navigator.language));
    };

    updateLabel();
    const intervalId = window.setInterval(updateLabel, 30_000);
    return () => window.clearInterval(intervalId);
  }, [timestamp]);

  if (!Number.isFinite(timestamp)) return "—";

  return (
    <time dateTime={new Date(timestamp).toISOString()}>{label || "…"}</time>
  );
}
