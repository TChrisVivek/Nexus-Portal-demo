export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { adminSupabase, supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || "bills";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.substring(0, 10) || 'png';
    const filename = `file_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

    const { error } = await adminSupabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
      });

    if (error) {
       console.error("Supabase Storage Error:", error);
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicData.publicUrl });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
