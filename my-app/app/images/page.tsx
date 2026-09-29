import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  const { data: images, error } = await supabase
    .from("images")
    .select("id, storage_path, captions(id, content)")
    .order("id");

  if (error) {
    return <p className="p-8">Error loading images and captions: {error.message}</p>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Humor project
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Image captions</h1>
      </header>

      {images?.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => {
            const imageUrl = supabase.storage
              .from("images")
              .getPublicUrl(image.storage_path).data.publicUrl;

            return (
              <li
                key={image.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <img
                  src={imageUrl}
                  alt={`Image ${image.id}`}
                  className="aspect-[4/3] w-full bg-zinc-100 object-cover"
                />
                <div className="p-5">
                  <p className="mb-3 truncate text-xs text-zinc-500" title={image.storage_path}>
                    {image.storage_path}
                  </p>
                  {image.captions.length ? (
                    <ul className="space-y-3">
                      {image.captions.map((caption) => (
                        <li
                          key={caption.id}
                          className="rounded-lg bg-zinc-50 p-3 text-sm leading-6 text-zinc-800"
                        >
                          {caption.content}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500">No captions yet.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl bg-zinc-100 p-6 text-zinc-600">
          No images have been added yet.
        </p>
      )}
    </main>
  );
}