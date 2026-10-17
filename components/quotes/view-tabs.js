"use client";
import { createContext, useContext, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Skeleton } from "../ui/skeleton";
const ViewContext = createContext({
  view: "graph",
  setView: () => {},
  isLoading: false,
  setIsLoading: () => {},
});
export function useView() {
  return useContext(ViewContext).view;
}
export function useViewState() {
  return useContext(ViewContext);
}
export default function ViewTabs({ children }) {
  const [view, setView] = useState("graph");
  const [isLoading, setIsLoading] = useState(false);
  return (
    <ViewContext.Provider value={{ view, setView, isLoading, setIsLoading }}>
      {children}
    </ViewContext.Provider>
  );
}
export function ViewSwitcher() {
  const { view, setView, setIsLoading } = useContext(ViewContext);
  return (
    <Tabs
      value={view}
      onValueChange={(nextView) => {
        setIsLoading(false);
        setView(nextView);
      }}
    >
      <TabsList aria-label="Result view">
        <TabsTrigger value="graph">Chart</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
export function ViewPanel({ view, children }) {
  const { view: currentView, isLoading } = useContext(ViewContext);
  if (currentView !== view) return null;
  if (isLoading) {
    return (
      <div
        className="min-w-0"
        role="status"
        aria-label={`Loading ${view === "graph" ? "graph" : "table"}`}
        aria-busy="true"
      >
        {view === "graph" ? <GraphLoadingState /> : <TableLoadingState />}
      </div>
    );
  }
  return <div className="min-w-0">{children}</div>;
}

function GraphLoadingState() {
  return (
    <div className="mb-4 rounded-xl border bg-card p-5 sm:p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-6 h-[220px] w-full sm:h-[290px]" />
      <div className="mt-5 flex justify-center gap-6 border-t pt-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function TableLoadingState() {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-3 w-52" />
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex gap-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, row) => (
          <div key={row} className="flex gap-4">
            {Array.from({ length: 8 }, (_, column) => (
              <Skeleton key={column} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
