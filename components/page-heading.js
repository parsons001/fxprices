export default function PageHeading({ mode }) {
  const sending = mode === "send";
  return <>
    <header className="flex h-16 items-center gap-2 border-b bg-card px-4 text-sm sm:px-6 lg:px-8">
      <span className="text-muted-foreground">Workspace</span><span aria-hidden="true" className="text-muted-foreground">/</span><span className="font-medium">{sending ? "Send" : "Convert"}</span>
    </header>
    <div className="mx-auto max-w-[1440px] px-4 pb-6 pt-7 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{sending ? "Transfer rates" : "Conversion rates"}</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{sending ? "Bank-transfer quotes, provider fees and historical markup." : "Currency exchange quotes, provider fees and historical markup."}</p>
    </div>
  </>;
}
