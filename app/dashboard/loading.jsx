/** Placeholder shown while a dashboard page loads its data on the server. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-10">
      <div className="space-y-3">
        <div className="skeleton h-11 w-72 rounded-xl" />
        <div className="skeleton h-5 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
