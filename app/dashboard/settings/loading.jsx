import { Bone, HeaderBones, PageSkeleton } from "@/components/ui/page-skeleton";

/** Shown at once when opening settings. */
export default function SettingsLoading() {
  return (
    <PageSkeleton label="Loading settings" className="mx-auto max-w-3xl space-y-4">
      <HeaderBones back={false} />
      <Bone className="h-40 rounded-2xl" />
      <Bone className="h-64 rounded-2xl" />
      <Bone className="h-40 rounded-2xl" />
      <Bone className="h-40 rounded-2xl" />
    </PageSkeleton>
  );
}
