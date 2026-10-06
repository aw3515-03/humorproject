"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string; caption: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append("file", file);

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
      <main style={{ padding: "2rem" }}>
        <h1>Generate a caption</h1>
        <p>You need to be logged in to upload an image and generate captions.</p>
        <button onClick={() => router.push("/login?next=/generate")}>Log in</button>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Generate a caption</h1>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={handleSubmit} disabled={!file || submitting}>
        {submitting ? "Generating..." : "Upload & Generate"}
      </button>

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <img src={result.imageUrl} alt="Uploaded" width={300} />
          <p>{result.caption}</p>
        </div>
      )}
    </main>
  );
}