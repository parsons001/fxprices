import QuotePage from "../../components/quotes/quote-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Page({ searchParams }) {
  return <QuotePage mode="convert" searchParams={searchParams} />;
}
