import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GeminiPart = {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

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

  const describePrompt = "Describe this image in a few sentences.";
  const description = await callGemini(describePrompt, imageUrl);
  const captionPrompt = "Look at this image and generate exactly 4 short, funny captions. Return only four lines, one caption per line, with no numbering or bullets.";
  const captionText = await callGemini(captionPrompt, imageUrl);
  const captions = parseCaptions(captionText);

  if (captions.length === 0) {
    return NextResponse.json({ error: "Gemini returned no usable captions." }, { status: 500 });
  }

  const { data: imageRow, error: imageInsertError } = await supabase
    .from("images")
    .insert({ user_id: user.id, image_url: imageUrl, description })
    .select()
    .single();

  if (imageInsertError) {
    return NextResponse.json({ step: "images insert", error: imageInsertError.message }, { status: 500 });
  }

  const captionRows = captions.map((caption) => ({
    image_id: imageRow.id,
    caption_text: caption,
    prompt_used: captionPrompt,
  }));

  const { data: captionRowsResult, error: captionInsertError } = await supabase
    .from("captions")
    .insert(captionRows)
    .select();

  if (captionInsertError) {
    return NextResponse.json({ step: "captions insert", error: captionInsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    image: imageRow,
    captions: captionRowsResult?.map((captionRow) => captionRow.caption_text) ?? captions,
  });
}

function parseCaptions(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

async function callGemini(prompt: string, imageUrl?: string): Promise<string> {
  const parts: GeminiPart[] = [{ text: prompt }];

  if (imageUrl) {
    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.status} ${imageRes.statusText}`);
    }

    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = imageRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      }),
    }
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini API request failed with status ${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.filter((part) => Boolean(part.text))
    ?.map((part) => part.text ?? "")
    ?.join("\n");

  if (!text) {
    throw new Error(`Gemini returned no text. Response: ${JSON.stringify(data)}`);
  }

  return text;
}
