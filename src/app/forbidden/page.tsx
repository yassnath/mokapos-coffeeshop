export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="border-border bg-card w-full max-w-md rounded-3xl border p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-neutral-900">Access denied</h1>
        <p className="mt-2 text-sm text-neutral-600">
          You do not have permission to access this page.
        </p>
      </div>
    </main>
  );
}
