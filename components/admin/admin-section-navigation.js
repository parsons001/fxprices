import Link from "next/link";

const sections = [
  { id: "users", label: "Users", href: "/admin" },
  {
    id: "cron-runs",
    label: "Provider Update Analytics",
    href: "/admin/cron-runs",
  },
];

export default function AdminSectionNavigation({ current }) {
  return (
    <nav aria-label="Admin sections" className="mb-6 flex gap-2 border-b">
      {sections.map((section) => {
        const active = section.id === current;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
