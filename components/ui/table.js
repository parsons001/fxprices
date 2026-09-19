import { cn } from "../../lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={cn(
          "w-full caption-bottom text-sm [&_td]:border-b [&_td]:border-border [&_td]:p-4 [&_td]:whitespace-nowrap [&_td]:tabular-nums [&_th]:h-12 [&_th]:px-4 [&_th]:text-left [&_th]:align-middle [&_th]:font-medium [&_th]:text-muted-foreground [&_tbody_tr:last-child_td]:border-0 [&_tbody_tr:hover]:bg-muted/50",
          className,
        )}
        {...props}
      />
    </div>
  );
}
