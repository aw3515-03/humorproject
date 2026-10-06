import { createClient } from "@/lib/supabase/server";
import VoteButtons from "@/components/VoteButtons";
import NavBar from "@/components/NavBar";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: images } = await supabase
    .from("images")
    .select(
      `
      id,
      image_url,
      created_at,
      captions (
        id,
        caption_text,
        votes (
          vote_type
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <NavBar />

      {/* Feed */}
      <main className="max-w-5xl mx-auto px-8 py-12">
        {!images || images.length === 0 ? (
          <p className="text-center text-zinc-500">
            No posts yet. Be the first to generate one!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {images.map((img) => (
              <div
                key={img.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col bg-white dark:bg-zinc-950"
              >
                <img
                  src={img.image_url}
                  alt="Generated content"
                  className="w-full h-56 object-cover"
                />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {img.captions?.map((c: { id: number; caption_text: string; votes: { vote_type: string }[] }) => {
                    const upvotes = c.votes.filter((v) => v.vote_type === "up").length;
                    const downvotes = c.votes.filter((v) => v.vote_type === "down").length;

                    return (
                      <div key={c.id} className="flex flex-col gap-2">
                        <p className="text-sm text-black dark:text-white">{c.caption_text}</p>
                        <VoteButtons
                          captionId={c.id}
                          isLoggedIn={!!user}
                          initialUpvotes={upvotes}
                          initialDownvotes={downvotes}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}