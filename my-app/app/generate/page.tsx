"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";

type Tab = "upload" | "link";
type LibraryTab = "library";


export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [sourceTab, setSourceTab] = useState<Tab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string; caption: string } | null>(null);

  const [libraryImages, setLibraryImages] = useState<{ id: number; image_url: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setIsLoggedIn(!!data.user);
      setUserId(data.user?.id ?? null);
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

  const handleSubmit = async () => {
    setSubmitting(true);

    const formData = new FormData();
    if (sourceTab === "upload" && file) {
      formData.append("file", file);
    } else if (sourceTab === "link" && linkUrl) {
      formData.append("imageUrl", linkUrl);
    } else {
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setResult({ imageUrl: data.image.image_url, caption: data.caption.caption_text });
    } else {
      alert("Error: " + data.error);
    }
  };

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <NavBar />
        <main className="max-w-xl mx-auto px-8 py-16 text-center">
          <h1 className="text-xl font-bold mb-4 text-black dark:text-white">
            Generate a caption
          </h1>
          <p className="text-zinc-500 mb-6">
            You need to be logged in to upload an image and generate captions.
          </p>
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />
      <main className="max-w-3xl mx-auto px-8 py-12">
        {/* Upload Photo / Enter Link toggle */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSourceTab("upload")}
            className={`flex-1 py-4 rounded-lg border font-semibold ${
              sourceTab === "upload"
                ? "border-yellow-400 text-yellow-500"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            Upload Photo
          </button>
          <button
            onClick={() => setSourceTab("link")}
            className={`flex-1 py-4 rounded-lg border font-semibold ${
              sourceTab === "link"
                ? "border-yellow-400 text-yellow-500"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            Enter Link
          </button>
        </div>

        {sourceTab === "upload" ? (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-6"
          />
        ) : (
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full mb-6 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || (sourceTab === "upload" ? !file : !linkUrl)}
          className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded disabled:opacity-50"
        >
          {submitting ? "Generating..." : "Upload & Generate"}
        </button>

        {result && (
          <div className="mt-8 border rounded-lg p-4 border-zinc-200 dark:border-zinc-800">
            <img src={result.imageUrl} alt="Uploaded" className="w-full max-w-sm rounded mb-3" />
            <p className="text-black dark:text-white">{result.caption}</p>
          </div>
        )}

        {/* Choose from your library */}
        <div className="mt-16">
          <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">
            Choose from your library
          </h2>
          {libraryImages.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              You haven't uploaded any images yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {libraryImages.map((img) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  alt=""
                  className="w-full h-32 object-cover rounded border border-zinc-200 dark:border-zinc-800"
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}