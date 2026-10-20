"use client";

import { useRouter } from "next/navigation";

export default function LoginRequiredModal({
  open,
  onClose,
  message = "Please log in to continue.",
  next = "/",
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
  next?: string;
}) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-yellow-400 text-xl font-bold mb-3">Login required</h2>
        <p className="text-zinc-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-zinc-500 text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => router.push(`/login?next=${encodeURIComponent(next)}`)}
            className="px-4 py-2 rounded bg-yellow-400 text-black font-semibold hover:bg-yellow-300"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}