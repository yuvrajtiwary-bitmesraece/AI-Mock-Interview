import { Bone, PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown at once when entering the interview room. */
export default function InterviewRoomLoading() {
  return (
    <PageSkeleton label="Loading your interview" className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-4 w-40" />
          <Bone className="h-4 w-56" />
        </div>
        <Bone className="h-10 w-40 rounded-full" />
      </div>
      <Bone className="mb-8 h-1 rounded-full" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Bone key={index} className="h-9 w-9 rounded-full" />
            ))}
          </div>
          <Bone className="h-56 rounded-2xl" />
          <Bone className="h-80 rounded-2xl" />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Bone className="aspect-video rounded-2xl" />
          <Bone className="h-36 rounded-2xl" />
        </div>
      </div>
    </PageSkeleton>
  );
}
