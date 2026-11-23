import { Bone, HeaderBones, PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown at once when opening the new-interview form. */
export default function NewInterviewLoading() {
  return (
    <PageSkeleton label="Loading the form" className="mx-auto max-w-4xl space-y-4">
      <HeaderBones />
      <div className="flex flex-wrap gap-2 pb-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Bone key={index} className="h-8 w-32 rounded-full" />
        ))}
      </div>
      <Bone className="h-96 rounded-2xl" />
      <Bone className="h-80 rounded-2xl" />
    </PageSkeleton>
  );
}
