import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { captionId, voteType, remove } = await request.json();

  if (remove === true) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("caption_id", captionId)
      .eq("user_id", user.id)
      .eq("vote_type", voteType);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, removed: true });
  }

  if (!["up", "down"].includes(voteType)) {
    return NextResponse.json({ error: "Invalid vote type" }, { status: 400 });
  }

  const { error } = await supabase
    .from("votes")
    .upsert(
      { caption_id: captionId, user_id: user.id, vote_type: voteType },
      { onConflict: "caption_id,user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}