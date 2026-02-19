"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border-border rounded-xl border px-3 py-2 text-sm"
    >
      Print Receipt
    </button>
  );
}
