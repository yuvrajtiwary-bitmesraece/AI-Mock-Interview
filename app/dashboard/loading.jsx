/** Placeholder shown while a dashboard page loads its data on the server. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-8">
      <div className="space-y-3">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-44" />
        ))}
      </div>
    </div>
  );
}
