import PageHeading from "../../components/page-heading";
import ViewTabs from "../../components/view-tabs";

export const metadata = { title: "Send" };

export default function ConvertLayout({ children }) {
  return <>
    <PageHeading mode="send" />
    <div className="mx-auto min-w-0 max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-8"><ViewTabs>{children}</ViewTabs></div>
  </>;
}
