import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";

export default async function ImagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/images");
  }

  const { data: images } = await supabase
    .from("images")
    .select("id, image_url, created_at, captions ( id, caption_text )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />
      <main className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-xl font-bold mb-8 text-black dark:text-white">
          Your Images
        </h1>
        {!images || images.length === 0 ? (
          <p className="text-zinc-500">You haven't uploaded anything yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {images.map((img) => (
              <div
                key={img.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950"
              >
                <img src={img.image_url} alt="" className="w-full h-56 object-cover" />
                <div className="p-4">
                  {img.captions?.map((c: { id: number; caption_text: string }) => (
                    <p key={c.id} className="text-sm text-black dark:text-white mb-2">
                      {c.caption_text}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}