import { useId } from "react";
import { Card, CardContent, CardHeader } from "./card";

export default function SidebarNotification({
  title,
  description,
  icon: Icon,
  children,
}) {
  const titleId = useId();

  return (
    <Card aria-labelledby={titleId} className="grid gap-2">
      <CardHeader className="p-4 pb-0">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          {Icon && <Icon className="size-4 text-primary" aria-hidden="true" />}
          {title}
        </h2>
        {description && (
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </CardHeader>
      {children && (
        <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>
      )}
    </Card>
  );
}
