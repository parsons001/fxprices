import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-4 grid gap-5" aria-live="polite" aria-busy="true">
      <Skeleton className="h-6 w-1/3" />
      <Card className="p-6">
        <Skeleton className="mb-5 h-5 w-1/4" />
        <Skeleton className="mb-3 h-20 w-full" />
        <Skeleton className="h-28 w-full" />
      </Card>
    </div>
  );
}
