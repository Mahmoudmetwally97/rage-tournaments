export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6" aria-busy="true">
      <div className="skel h-10 w-64" />
      <div className="skel h-4 w-96 max-w-full" />
      <div className="grid gap-5 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel h-56" />
        ))}
      </div>
    </div>
  );
}
