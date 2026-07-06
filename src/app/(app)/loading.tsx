import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading state: mirrors the module template's layout. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="space-y-2 pb-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="mt-4 h-72" />
      <Skeleton className="mt-4 h-56" />
    </div>
  );
}
