"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { setGenerationPopupState } from "@/components/GenerationStatusPopup";

type Tab = "upload" | "link";
type Screen = "upload" | "generating" | "results";
type CaptionEntry = { id: number; caption_text: string; is_published?: boolean };

export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sourceTab, setSourceTab] = useState<Tab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [screen, setScreen] = useState<Screen>("upload");
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [showPostSuccess, setShowPostSuccess] = useState(false);
  const [selectedLibraryImageId, setSelectedLibraryImageId] = useState<number | null>(null);
  const [libraryImages, setLibraryImages] = useState<{ id: number; image_url: string }[]>([]);
  const generationPromiseRef = useRef<Promise<void> | null>(null);
  const generationModeRef = useRef<"full" | "background">("full");

  const handleLibraryImageSelect = (image: { id: number; image_url: string }) => {
    setSelectedLibraryImageId(image.id);
    setSourceTab("link");
    setLinkUrl(image.image_url);
    setFile(null);
    setGenerationPopupState({ visible: false, status: "loading", imageUrl: null });
    setScreen("generating");
    void startGeneration("full");
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setIsLoggedIn(!!data.user);
      setLoading(false);

      if (data.user) {
        const { data: images } = await supabase
          .from("images")
          .select("id, image_url")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });
        setLibraryImages(images ?? []);
      }
    });
  }, []);

  const startGeneration = async (mode: "full" | "background" = "full") => {
    generationModeRef.current = mode;

    const isUploadSource = sourceTab === "upload" && !!file;
    const isLinkSource = sourceTab === "link" && !!linkUrl;

    if (!isUploadSource && !isLinkSource) {
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    if (mode === "full") {
      setGenerationPopupState({ visible: false, status: "loading", imageUrl: null });
      setScreen("generating");
    } else {
      setScreen("upload");
      const preview = sourceTab === "upload" && file ? await fileToDataUrl(file) : linkUrl || null;
      setGenerationPopupState({ visible: true, status: "loading", imageUrl: preview });
    }

    const formData = new FormData();
    if (sourceTab === "upload" && file) {
      formData.append("file", file);
    } else if (sourceTab === "link" && linkUrl) {
      formData.append("imageUrl", linkUrl);
    }

    const runRequest = async () => {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Error: " + (data.error ?? "Unable to generate captions"));
        setSubmitting(false);
        if (mode === "full") {
          setScreen("upload");
        }
        return;
      }

      const nextCaptions = Array.isArray(data.captions) && data.captions.length > 0
        ? data.captions.map((caption: string | { id?: number; caption_text?: string; is_published?: boolean }) => {
            if (typeof caption === "string") {
              return { id: 0, caption_text: caption, is_published: false };
            }

            return {
              id: Number(caption.id ?? 0),
              caption_text: String(caption.caption_text ?? ""),
              is_published: Boolean(caption.is_published),
            };
          })
        : data.caption && data.caption.caption_text
          ? [{ id: Number(data.caption.id ?? 0), caption_text: String(data.caption.caption_text), is_published: Boolean(data.caption.is_published) }]
          : [];

      const imageUrl = data.image?.image_url ?? linkUrl;

      setResultImageUrl(imageUrl);
      setCaptions(nextCaptions);
      setCaptionIndex(0);
      setSubmitting(false);

      if (generationModeRef.current === "full") {
        setScreen("results");
      } else {
        setScreen("upload");
        const preview = sourceTab === "upload" && file ? await fileToDataUrl(file) : linkUrl || imageUrl || null;
        setGenerationPopupState({ visible: true, status: "done", imageUrl: preview });
      }
    };

    generationPromiseRef.current = runRequest();

    try {
      await generationPromiseRef.current;
    } finally {
      generationPromiseRef.current = null;
    }
  };

  const handleGenerate = () => {
    void startGeneration("full");
  };

  const handleContinueBrowsing = async () => {
    generationModeRef.current = "background";
    setScreen("upload");
    setSubmitting(false);
    const preview = sourceTab === "upload" && file ? await fileToDataUrl(file) : linkUrl || resultImageUrl || null;
    setGenerationPopupState({ visible: true, status: "loading", imageUrl: preview });
  };

  const handleCrackAgain = () => {
    setGenerationPopupState({ visible: false, status: "loading", imageUrl: null });
    setScreen("generating");
    void startGeneration("full");
  };

  const handleCrackNewImage = () => {
    setScreen("upload");
    setGenerationPopupState({ visible: false, status: "loading", imageUrl: null });
    setCaptions([]);
    setCaptionIndex(0);
    setResultImageUrl(null);
    setFile(null);
    setLinkUrl("");
    setSelectedLibraryImageId(null);
    setSourceTab("upload");
  };

  const currentCaption = captions[captionIndex];

  const handlePostCurrentCaption = async () => {
    const captionToPost = captions[captionIndex];

    if (!captionToPost || !captionToPost.id) {
      alert("This caption is not ready to post yet.");
      return;
    }

    const nextPublishedState = !captionToPost.is_published;
    const supabase = createClient();
    const { error } = await supabase
      .from("captions")
      .update({ is_published: nextPublishedState })
      .eq("id", captionToPost.id);

    if (error) {
      alert("Unable to update this caption right now.");
      return;
    }

    setCaptions((prev) => prev.map((caption, index) =>
      index === captionIndex ? { ...caption, is_published: nextPublishedState } : caption
    ));

    if (nextPublishedState) {
      setShowPostSuccess(true);
    }
  };

  async function fileToDataUrl(fileToConvert: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(fileToConvert);
    });
  }
  const progressPercent = captions.length > 0 ? ((captionIndex + 1) / captions.length) * 100 : 25;
  const isCurrentCaptionPublished = Boolean(currentCaption?.is_published);

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <NavBar />
        <main className="max-w-xl mx-auto px-8 py-16 text-center">
          <h1 className="text-xl font-bold mb-4 text-black dark:text-white">Generate a caption</h1>
          <p className="text-zinc-500 mb-6">You need to be logged in to upload an image and generate captions.</p>
          <button
            onClick={() => router.push("/login?next=/generate")}
            className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded"
          >
            Log in
          </button>
        </main>
      </div>
    );
  }

  if (screen === "generating") {
    return (
      <div className="min-h-screen bg-[#05070a] text-white">
        <NavBar />
        <main className="max-w-xl mx-auto px-8 py-16 flex flex-col items-center justify-center">
          <div className="mb-4 text-7xl">★</div>
          <h1 className="text-4xl sm:text-5xl font-black text-yellow-400 text-center leading-tight">
            Generating caption...
          </h1>
          <p className="mt-6 text-xl text-zinc-200">Your captions are queued...</p>

          <div className="mt-6 w-full max-w-md h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-yellow-400" />
          </div>

          <button
            type="button"
            onClick={handleContinueBrowsing}
            className="mt-8 w-full max-w-md rounded-lg border border-yellow-400 bg-yellow-400 px-5 py-4 text-lg font-bold text-black shadow-[0_0_0_1px_rgba(250,204,21,0.3)]"
          >
            Continue browsing
          </button>

          <p className="mt-6 text-center text-zinc-300 text-base max-w-md">
            Don&apos;t worry, we&apos;ll notify you when your captions are done.
          </p>
        </main>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div className="min-h-screen bg-[#05070a] text-white">
        <NavBar />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="mx-auto max-w-[560px]">
            <div className="mb-6 flex items-center justify-center gap-6">
              <button
                type="button"
                disabled={captionIndex === 0}
                onClick={() => setCaptionIndex((prev) => Math.max(prev - 1, 0))}
                className="h-12 w-12 border border-zinc-600 bg-transparent text-2xl text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Previous caption"
              >
                ←
              </button>

              <div className="flex-1">
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-200 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={captionIndex >= captions.length - 1}
                onClick={() => setCaptionIndex((prev) => Math.min(prev + 1, captions.length - 1))}
                className="h-12 w-12 border border-zinc-600 bg-transparent text-2xl text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next caption"
              >
                →
              </button>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 shadow-lg">
              <div className="overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                <img src={resultImageUrl ?? ""} alt="Generated" className="h-[360px] w-full object-cover" />
              </div>


              <p className="mt-6 text-center text-2xl font-medium leading-relaxed text-zinc-100">
                {currentCaption?.caption_text}
              </p>

              <div className="mt-6 flex items-center justify-center gap-4 text-zinc-300">
                <button type="button" className="text-2xl" aria-label="Bookmark">☆</button>
                <button type="button" className="text-2xl" aria-label="Share">↗</button>
              </div>

              <button
                type="button"
                onClick={handlePostCurrentCaption}
                className={`mt-6 w-full rounded-md border px-4 py-3 text-base font-semibold transition-colors ${
                  isCurrentCaptionPublished
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-yellow-400 bg-yellow-400 text-black"
                }`}
              >
                {isCurrentCaptionPublished ? "Posted" : "Post"}
              </button>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={handleCrackAgain}
                className="flex-1 rounded-md border border-yellow-400 bg-transparent px-4 py-3 text-lg font-semibold text-yellow-400"
              >
                Crack Again
              </button>
              <button
                type="button"
                onClick={handleCrackNewImage}
                className="flex-1 rounded-md border border-yellow-400 bg-yellow-400 px-4 py-3 text-lg font-semibold text-black"
              >
                Crack New Image
              </button>
            </div>
          </div>
        </main>

        {showPostSuccess && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative h-[min(52vh,320px)] w-full max-w-md rounded-2xl border border-zinc-700 bg-[#111214] p-6 pt-10 text-center text-white shadow-2xl">
              <button
                type="button"
                onClick={() => setShowPostSuccess(false)}
                className="absolute right-4 top-4 z-10 text-2xl text-zinc-300"
                aria-label="Close post confirmation"
              >
                ×
              </button>

              <div className="flex h-full flex-col items-center justify-center overflow-y-auto">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 text-2xl text-black">
                  ✓
                </div>

                <h2 className="text-2xl font-black text-yellow-400">Caption posted!</h2>
                <p className="mt-3 text-base text-zinc-200">
                  Your caption has been made public and is now visible to others.
                </p>

                <button
                  type="button"
                  onClick={() => setShowPostSuccess(false)}
                  className="mt-6 w-full rounded-md bg-yellow-400 px-4 py-3 text-base font-semibold text-black"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <NavBar />
      <main className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSourceTab("upload")}
            className={`flex-1 rounded-lg border py-4 text-lg font-semibold ${
              sourceTab === "upload"
                ? "border-yellow-400 bg-yellow-400 text-black"
                : "border-yellow-400 text-yellow-400"
            }`}
          >
            Upload Photo
          </button>
          <button
            onClick={() => setSourceTab("link")}
            className={`flex-1 rounded-lg border py-4 text-lg font-semibold ${
              sourceTab === "link"
                ? "border-yellow-400 bg-yellow-400 text-black"
                : "border-yellow-400 text-yellow-400"
            }`}
          >
            Enter Link
          </button>
        </div>

        {sourceTab === "upload" ? (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setSelectedLibraryImageId(null);
            }}
            className="mb-6 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-3 text-white"
          />
        ) : (
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setSelectedLibraryImageId(null);
            }}
            className="mb-6 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-3 text-white"
          />
        )}

        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="text-zinc-400 text-sm">{sourceTab === "upload" ? "Upload a photo" : "Add a link"}</div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={submitting || (sourceTab === "upload" ? !file : !linkUrl)}
            className="rounded-xl bg-yellow-400 px-6 py-3 text-lg font-bold text-black disabled:opacity-50"
          >
            {submitting ? "Generating..." : "Upload & Generate"}
          </button>
        </div>

        <div className="mt-16">
          <h2 className="mb-4 text-lg font-semibold text-white">Choose from your library</h2>
          {libraryImages.length === 0 ? (
            <p className="text-zinc-500 text-sm">You have not uploaded any images yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {libraryImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => handleLibraryImageSelect(img)}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    selectedLibraryImageId === img.id
                      ? "border-yellow-400 ring-2 ring-yellow-400/60"
                      : "border-zinc-800"
                  }`}
                >
                  <img src={img.image_url} alt="Library image" className="h-40 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
