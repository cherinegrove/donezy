import { extractDescriptionImages } from "@/lib/taskDescriptionImages";

export function DescriptionImages({ text }: { text: string }) {
  const urls = extractDescriptionImages(text);
  if (urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Description image" className="h-24 w-auto rounded border object-cover" />
        </a>
      ))}
    </div>
  );
}
