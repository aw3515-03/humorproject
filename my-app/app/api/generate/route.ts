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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const linkUrl = formData.get("imageUrl") as string | null;

  let imageUrl: string;

  if (file) {
    // 1. Upload image to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (uploadError) {
      return NextResponse.json({ step: "storage upload", error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(filePath);
    imageUrl = publicUrlData.publicUrl;
  } else if (linkUrl) {
    imageUrl = linkUrl;
  } else {
    return NextResponse.json({ error: "No file or link provided" }, { status: 400 });
  }

  // 2. Ask the LLM to describe the image
  const describePrompt = "Describe this image in a few sentences.";
  const description = await callGemini(describePrompt, imageUrl);

  // 3. Ask the LLM to make a funny remark based on that description
  const funnyPrompt = `Here is a description of an image: "${description}". Write one short, funny caption based on this description.`;
  const funnyCaption = await callGemini(funnyPrompt);

  // 4. Insert the image row
  const { data: imageRow, error: imageInsertError } = await supabase
    .from("images")
    .insert({ user_id: user.id, image_url: imageUrl, description })
    .select()
    .single();

  if (imageInsertError) {
    return NextResponse.json({ step: "images insert", error: imageInsertError.message }, { status: 500 });
  }

  // 5. Insert the caption row
  const { data: captionRow, error: captionInsertError } = await supabase
    .from("captions")
    .insert({
      image_id: imageRow.id,
      caption_text: funnyCaption,
      prompt_used: funnyPrompt,
    })
    .select()
    .single();

  if (captionInsertError) {
    return NextResponse.json({ step: "captions insert", error: captionInsertError.message }, { status: 500 });
  }

  return NextResponse.json({ image: imageRow, caption: captionRow });
}

async function callGemini(prompt: string, imageUrl?: string): Promise<string> {
  const parts: any[] = [{ text: prompt }];

  if (imageUrl) {
    // Fetch the image and convert to base64 for Gemini
    const imageRes = await fetch(imageUrl);
    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = imageRes.headers.get("content-type") ?? "image/jpeg";

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";
}