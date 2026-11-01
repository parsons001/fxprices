"use client";

import { useBrowserDateFormatter } from "../quotes/use-browser-date-formatter";

export default function LocalizedDate({ value, options, className }) {
  const formatDate = useBrowserDateFormatter();
  if (!value) return "—";

  return (
    <time dateTime={new Date(value).toISOString()} className={className}>
      {formatDate(value, options)}
    </time>
  );
}
