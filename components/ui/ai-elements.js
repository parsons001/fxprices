import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/utils/utils";

export function MarkdownContent({ children, className }) {
  return (
    <div
      className={cn(
        "min-w-0 whitespace-normal break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children: linkChildren, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {linkChildren}
            </a>
          ),
          table: ({ children: tableChildren, ...props }) => (
            <div className="my-3 overflow-x-auto">
              <table {...props}>{tableChildren}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function MessageGroup({ className, ...props }) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex min-w-0 flex-col gap-5", className)}
      {...props}
    />
  );
}

export function Message({ align = "start", className, ...props }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "group/message relative flex w-full min-w-0 data-[align=end]:flex-row-reverse",
        className,
      )}
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }) {
  return (
    <div
      data-slot="message-content"
      className={cn("flex w-full min-w-0 flex-col wrap-break-word", className)}
      {...props}
    />
  );
}

export function Bubble({
  align = "start",
  variant = "default",
  className,
  ...props
}) {
  return (
    <div
      data-slot="bubble"
      data-align={align}
      data-variant={variant}
      className={cn(
        "w-fit max-w-full rounded-xl px-4 py-3 text-sm leading-6",
        variant === "muted"
          ? "bg-muted text-foreground"
          : "bg-background text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function BubbleContent({ className, ...props }) {
  return (
    <div
      data-slot="bubble-content"
      className={cn("min-w-0 whitespace-pre-wrap wrap-break-word", className)}
      {...props}
    />
  );
}

export function InputGroup({ className, ...props }) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group flex w-full min-w-0 flex-col rounded-xl border border-input bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupTextarea({ className, ...props }) {
  return (
    <textarea
      data-slot="input-group-control"
      className={cn(
        "min-h-14 w-full resize-y rounded-t-xl bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupAddon({ className, ...props }) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(
        "flex items-center justify-end border-t px-2 py-2",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupButton({ className, ...props }) {
  return (
    <button
      data-slot="input-group-button"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
