"use client";

import { createContext, useContext, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const ViewContext = createContext("graph");

export function useView() {
  return useContext(ViewContext);
}

export default function ViewTabs({ children }) {
  const [view, setView] = useState("graph");

  return <ViewContext.Provider value={view}>
    <Tabs value={view} onValueChange={setView} className="mb-5">
      <TabsList aria-label="Result view">
        <TabsTrigger value="graph">Graph</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
    </Tabs>
    {children}
  </ViewContext.Provider>;
}

export function ViewPanel({ view, children }) {
  const activeView = useContext(ViewContext);
  if (activeView !== view) return null;
  return <div className="min-w-0">{children}</div>;
}
