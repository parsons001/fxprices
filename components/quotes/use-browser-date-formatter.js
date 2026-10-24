"use client";

import { useEffect, useState } from "react";

export function useBrowserDateFormatter() {
  const [browserSettings, setBrowserSettings] = useState(null);

  useEffect(() => {
    setBrowserSettings({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, []);

  return (value, options) =>
    new Date(value).toLocaleString(browserSettings?.locale ?? "en-GB", {
      timeZone: browserSettings?.timeZone ?? "UTC",
      ...options,
    });
}
