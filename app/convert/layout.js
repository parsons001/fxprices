import ViewTabs from "../../components/view-tabs";

export const metadata = { title: "Convert" };

export default function ConvertLayout({ children }) {
  return <>
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">FX CONVERT</p>
      <h1 className="my-3 text-4xl font-semibold tracking-tight sm:text-5xl">Conversion rates</h1>
    </header>
    <ViewTabs>{children}</ViewTabs>
  </>;
}
