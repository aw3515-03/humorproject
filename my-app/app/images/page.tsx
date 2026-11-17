"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";

type Caption = { id: number; caption_text: string; is_published?: boolean };
type ImageRecord = {
  id: number;
  image_url: string;
  captions: Caption[] | null;
};

export default function ImagesPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [selectedCaptionIndex, setSelectedCaptionIndex] = useState(0);
  const [showPostSuccess, setShowPostSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const loadImages = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/images");
        return;
      }

      const { data, error } = await supabase
        .from("images")
        .select("id, image_url, captions ( id, caption_text, is_published )")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setImages((data ?? []) as ImageRecord[]);
      }

      setLoading(false);
    };

    loadImages();
  }, [router]);

  const selectedImage = images.find((img) => img.id === selectedImageId) ?? null;
  const activeCaptions = selectedImage?.captions ?? [];
  const currentCaption = activeCaptions[selectedCaptionIndex] ?? null;
  const progressPercent = activeCaptions.length > 0 ? ((selectedCaptionIndex + 1) / activeCaptions.length) * 100 : 0;

  const openImage = (imageId: number) => {
    setSelectedImageId(imageId);
    setSelectedCaptionIndex(0);
  };

  const closeImage = () => {
    setSelectedImageId(null);
    setSelectedCaptionIndex(0);
  };

  const handleDelete = async (imageId: number) => {
    const supabase = createClient();

    await supabase.from("captions").delete().eq("image_id", imageId);
    await supabase.from("images").delete().eq("id", imageId);

    setImages((prev) => prev.filter((img) => img.id !== imageId));
    closeImage();
  };

  const handlePostCurrentCaption = async () => {
    const captionToPost = currentCaption;

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

    setImages((prev) => prev.map((img) => {
      if (img.id !== selectedImageId) {
        return img;
      }

      return {
        ...img,
        captions: (img.captions ?? []).map((caption, index) =>
          index === selectedCaptionIndex ? { ...caption, is_published: nextPublishedState } : caption
        ),
      };
    }));

    if (nextPublishedState) {
      setShowPostSuccess(true);
    }
  };

  const handleCrackAgain = () => {
    if (!selectedImage) return;

    closeImage();
    router.push(`/generate?image_url=${encodeURIComponent(selectedImage.image_url)}`);
  };

  const handleCrackNewImage = () => {
    closeImage();
    router.push("/generate");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <NavBar />
        <main className="max-w-5xl mx-auto px-8 py-12">
          <p className="text-zinc-500">Loading your images...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />
      <main className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-xl font-bold mb-8 text-black dark:text-white">
          Your Images
        </h1>
        {!images.length ? (
          <p className="text-zinc-500">You haven&apos;t uploaded anything yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => openImage(img.id)}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm transition hover:scale-[1.01] dark:border-zinc-800 dark:bg-zinc-950"
              >
                <img src={img.image_url} alt="User uploaded" className="h-56 w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </main>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 h-[min(88vh,720px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-[#111214] p-5 pt-10 text-white shadow-2xl">
            <button
              type="button"
              onClick={closeImage}
              className="absolute right-4 top-4 z-10 text-3xl text-zinc-300"
              aria-label="Close image preview"
            >
              ×
            </button>

            <div className="h-full overflow-y-auto pr-1">
              <div className="mb-6 flex items-center justify-center gap-6">
              <button
                type="button"
                disabled={selectedCaptionIndex === 0}
                onClick={() => setSelectedCaptionIndex((prev) => Math.max(prev - 1, 0))}
                className="h-12 w-12 border border-zinc-600 bg-transparent text-2xl text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Previous caption"
              >
                ←
              </button>

              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-200 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={selectedCaptionIndex >= activeCaptions.length - 1}
                onClick={() => setSelectedCaptionIndex((prev) => Math.min(prev + 1, activeCaptions.length - 1))}
                className="h-12 w-12 border border-zinc-600 bg-transparent text-2xl text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next caption"
              >
                →
              </button>
            </div>

            <div className="overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
              <img src={selectedImage.image_url} alt="Selected upload" className="h-[360px] w-full object-cover" />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-lg font-black text-yellow-400">CRACK</span>
              <span className="text-lg font-black text-white">’D</span>
            </div>

            <p className="mt-6 text-center text-2xl font-medium leading-relaxed text-zinc-100">
              {currentCaption?.caption_text}
            </p>

            <button
              type="button"
              onClick={handlePostCurrentCaption}
              className={`mt-6 w-full rounded-md border px-4 py-3 text-base font-semibold transition-colors ${
                currentCaption?.is_published
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-yellow-400 bg-yellow-400 text-black"
              }`}
            >
              {currentCaption?.is_published ? "Posted" : "Post"}
            </button>

              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCrackAgain}
                  className="flex-1 rounded-md border border-yellow-400 bg-transparent px-4 py-3 text-base font-semibold text-yellow-400"
                >
                  Crack Again
                </button>
                <button
                  type="button"
                  onClick={handleCrackNewImage}
                  className="flex-1 rounded-md border border-yellow-400 bg-yellow-400 px-4 py-3 text-base font-semibold text-black"
                >
                  Crack New Image
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedImage.id)}
                  className="rounded-md border border-red-400/60 bg-transparent px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-red-300 transition hover:bg-red-500/5"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedImage && showPostSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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