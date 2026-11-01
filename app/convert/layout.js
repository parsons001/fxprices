import PageHeading from "../../components/layout/page-heading";

export const metadata = { title: "Convert" };

export default function ConvertLayout({ children }) {
  return (
    <>
      <PageHeading
        breadcrumb="Convert"
        title="Conversion rates"
        description="Currency exchange quotes, provider fees and historical markup."
      />
      <div className="mx-auto min-w-0 max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </>
  );
}
