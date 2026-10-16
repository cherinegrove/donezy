import { supabase } from "@/integrations/supabase/client";

const IMAGE_PATTERN = /!\[image\]\((https?:\/\/[^)\s]+)\)/g;

export async function uploadDescriptionImage(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("comment-images")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from("comment-images").getPublicUrl(data.path);
  return urlData.publicUrl;
}

export function extractDescriptionImages(text: string): string[] {
  return Array.from(text.matchAll(IMAGE_PATTERN), (match) => match[1]);
}

export function imageMarkdown(url: string): string {
  return `![image](${url})`;
}
