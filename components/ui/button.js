import { cn } from "../../lib/utils/utils";

const variants = {
  default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  outline:
    "border border-input bg-background shadow-xs hover:bg-muted hover:text-foreground",
  secondary: "bg-muted text-foreground shadow-xs hover:bg-muted/80",
  ghost: "hover:bg-muted hover:text-foreground",
  destructive: "text-red-700 hover:bg-red-50",
  link: "text-foreground underline-offset-4 hover:underline",
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3",
  icon: "size-9 p-0",
  "icon-xs": "size-4 p-0 rounded-sm",
  menu: "h-9 w-full justify-start rounded-sm px-2 text-left",
  link: "h-auto p-0",
};

export function buttonVariants({
  className,
  size = "default",
  variant = "default",
} = {}) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  as: Component = "button",
  className,
  size = "default",
  variant = "default",
  ...props
}) {
  return (
    <Component
      data-slot="button"
      className={buttonVariants({ className, size, variant })}
      {...props}
    />
  );
}
