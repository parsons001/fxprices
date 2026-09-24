"use client";
import { createContext, useContext, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
const ViewContext = createContext({ view: "graph", setView: () => {} });
export function useView() { return useContext(ViewContext).view; }
export default function ViewTabs({ children }) {
  const [view, setView] = useState("graph");
  return <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>;
}
export function ViewSwitcher() {
  const { view, setView } = useContext(ViewContext);
  return <Tabs value={view} onValueChange={setView}><TabsList aria-label="Result view"><TabsTrigger value="graph">Chart</TabsTrigger><TabsTrigger value="table">Table</TabsTrigger></TabsList></Tabs>;
}
export function ViewPanel({ view, children }) {
  return useView() === view ? <div className="min-w-0">{children}</div> : null;
}
