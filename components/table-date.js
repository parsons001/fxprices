"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useView } from "./view-tabs";
import { SelectField } from "./ui/select-field";
import { SelectItem } from "./ui/select";

const TableDateContext = createContext(null);

export function TableDateProvider({ dates, children }) {
  const [selectedDate, setSelectedDate] = useState(() => dates.at(-1) ?? "");

  useEffect(() => {
    if (!dates.includes(selectedDate)) setSelectedDate(dates.at(-1) ?? "");
  }, [dates, selectedDate]);

  return <TableDateContext.Provider value={{ dates, selectedDate, setSelectedDate }}>{children}</TableDateContext.Provider>;
}

export function TableDateSelect() {
  const view = useView();
  const { dates, selectedDate, setSelectedDate } = useTableDate();
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    setSlot(document.getElementById("table-date-slot"));
  }, [view]);

  if (view !== "table" || !slot) return null;

  return createPortal(
    <SelectField label="Quote date" value={selectedDate} onValueChange={setSelectedDate}>
      {dates.map((date) => <SelectItem key={date} value={date}>{formatDate(date)}</SelectItem>)}
    </SelectField>,
    slot,
  );
}

export function useTableDate() {
  const context = useContext(TableDateContext);
  if (!context) throw new Error("useTableDate must be used within a TableDateProvider");
  return context;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
