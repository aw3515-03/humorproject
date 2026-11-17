"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type GenerationPopupState = {
  visible: boolean;
  status: "loading" | "done";
  imageUrl: string | null;
  message?: string;
};

const STORAGE_KEY = "humor-generation-popup";

export function setGenerationPopupState(nextState: GenerationPopupState) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(
    new CustomEvent<GenerationPopupState>("generation-popup-state-changed", {
      detail: nextState,
    })
  );
}

export default function GenerationStatusPopup() {
  const router = useRouter();
  const [popup, setPopup] = useState<GenerationPopupState>({
    visible: false,
    status: "loading",
    imageUrl: null,
  });

  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved) as GenerationPopupState;
        setPopup({
          visible: !!parsed.visible,
          status: parsed.status === "done" ? "done" : "loading",
          imageUrl: parsed.imageUrl ?? null,
          message: parsed.message,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    load();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        load();
      }
    };
    const handleCustomEvent = (event: Event) => {
      const next = (event as CustomEvent<GenerationPopupState>).detail;
      if (next) {
        setPopup(next);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("generation-popup-state-changed", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("generation-popup-state-changed", handleCustomEvent);
    };
  }, []);

  if (!popup.visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] rounded-lg border border-zinc-700 bg-[#111214] p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded border border-zinc-700 bg-zinc-900">
            {popup.imageUrl ? (
              <img src={popup.imageUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500">IMG</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-white">
              {popup.status === "loading" ? "Creating your captions..." : "Your captions are ready!"}
            </p>
            <p className="text-sm text-zinc-300">
              {popup.status === "loading"
                ? "Your caption is being generated."
                : "Your captions have finished. Take a look!"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGenerationPopupState({ ...popup, visible: false })}
          className="text-2xl text-zinc-400"
          aria-label="Close popup"
        >
          ×
        </button>
      </div>

      {popup.status === "done" && (
        <button
          type="button"
          onClick={() => {
            setGenerationPopupState({ ...popup, visible: false });
            router.push("/images");
          }}
          className="mt-4 w-full rounded-md bg-yellow-400 px-4 py-2 text-base font-bold text-black"
        >
          View captions
        </button>
      )}
    </div>
  );
}
