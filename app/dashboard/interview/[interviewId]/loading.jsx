import { Bone, HeaderBones, PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown at once when opening an interview's "get ready" screen. */
export default function InterviewLobbyLoading() {
  return (
    <PageSkeleton label="Loading your interview" className="mx-auto max-w-6xl">
      <HeaderBones />
      <div className="mb-10 flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Bone key={index} className="h-6 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Bone className="h-72 rounded-2xl" />
          <Bone className="h-44 rounded-2xl" />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <Bone className="h-[26rem] rounded-2xl" />
          <Bone className="h-12 rounded-full" />
        </div>
      </div>
    </PageSkeleton>
  );
}
