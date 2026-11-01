export default function PageHeading({ breadcrumb, title, description }) {
  return (
    <>
      <header className="hidden h-16 items-center gap-2 border-b bg-card px-4 text-sm sm:px-6 lg:flex lg:px-8">
        <span className="text-muted-foreground">Dashboard</span>
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <span className="font-medium">{breadcrumb}</span>
      </header>
      <div className="mx-auto max-w-[1440px] px-4 pb-6 pt-7 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </>
  );
}
