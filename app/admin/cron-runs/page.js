import { requireAdminUser } from "../../../lib/auth-session.js";
import { cronRunStore } from "../../../lib/db/cron-run-store.js";
import CronRunsAnalytics from "../../../components/admin/cron-runs-analytics.js";
import AdminSectionNavigation from "../../../components/admin/admin-section-navigation.js";
import PageHeading from "../../../components/layout/page-heading.js";

export const metadata = { title: "Cron run analytics" };
export const dynamic = "force-dynamic";

export default async function AdminCronRunsPage() {
  await requireAdminUser("/admin/cron-runs");
  const runs = await cronRunStore.latest();

  return (
    <>
      <PageHeading
        breadcrumb="Admin"
        title="Cron run analytics"
        description="Review quote refresh performance, reliability, and failures."
        beforeTitle={<AdminSectionNavigation current="cron-runs" />}
      />
      <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
        <CronRunsAnalytics runs={runs} />
      </main>
    </>
  );
}
