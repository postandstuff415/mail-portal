"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mx-auto mt-4 block h-12 w-full max-w-sm rounded-md bg-[#ffd166] font-semibold text-[#1c1a1d] print:hidden"
    >
      Print
    </button>
  );
}
