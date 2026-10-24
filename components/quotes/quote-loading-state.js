import { Skeleton } from "../ui/skeleton";

export default function QuoteLoadingState() {
  return (
    <div
      className="mt-6 space-y-4"
      role="status"
      aria-label="Loading quotes"
      aria-busy="true"
    >
      <span className="sr-only">Loading quotes…</span>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-4 w-3/4" />
        <Skeleton className="mt-6 h-[220px] w-full sm:h-[290px]" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4 sm:px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          {Array.from({ length: 5 }, (_, row) => (
            <div key={row} className="flex gap-4">
              {Array.from({ length: 6 }, (_, column) => (
                <Skeleton key={column} className="h-5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
