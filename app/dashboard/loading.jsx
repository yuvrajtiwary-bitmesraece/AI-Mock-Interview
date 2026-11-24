import { Bone, HeaderBones, PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown at once when opening the dashboard, while the server loads your progress. */
export default function DashboardLoading() {
  return (
    <PageSkeleton label="Loading your dashboard" className="space-y-4">
      <div className="flex items-end justify-between gap-6">
        <HeaderBones back={false} />
        <Bone className="mb-6 hidden h-11 w-44 rounded-full sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Bone key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Bone className="h-80 rounded-2xl lg:col-span-2" />
        <Bone className="h-80 rounded-2xl" />
      </div>
    </PageSkeleton>
  );
}
