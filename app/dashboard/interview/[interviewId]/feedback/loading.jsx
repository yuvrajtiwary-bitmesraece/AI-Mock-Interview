import { Bone, HeaderBones, PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown at once when opening a report, while the server gathers the answers. */
export default function ReportLoading() {
  return (
    <PageSkeleton label="Loading your report" className="mx-auto max-w-5xl space-y-4">
      <HeaderBones description={false} />
      <div className="grid gap-4 md:grid-cols-3">
        <Bone className="h-72 rounded-2xl" />
        <Bone className="h-72 rounded-2xl md:col-span-2" />
      </div>
      <Bone className="h-80 rounded-2xl" />
      <div className="space-y-3 pt-8">
        <Bone className="h-7 w-56" />
        {Array.from({ length: 3 }, (_, index) => (
          <Bone key={index} className="h-[4.5rem] rounded-2xl" />
        ))}
      </div>
    </PageSkeleton>
  );
}
