import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { validateImageFile } from "@/lib/image";
import { getMediaUrl } from "@/api/client";

interface ImagePickerProps {
  /** A freshly picked file not yet uploaded (takes display priority). */
  file: File | null;
  /** The product's currently saved image URL (when editing). */
  existingUrl: string | null;
  onSelect: (file: File) => void;
  /** Remove the shown photo (clears a picked file, or marks the saved one for removal). */
  onRemove: () => void;
  /** Surface a validation problem (wrong type / too big) in plain language. */
  onError: (message: string | null) => void;
}

/** Photo picker from gallery/camera with preview, Replace and Remove. */
export function ImagePicker({ file, existingUrl, onSelect, onRemove, onError }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Manage the object URL lifecycle for a picked file.
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shownUrl = filePreview ?? existingUrl;
  const resolvedUrl = getMediaUrl(shownUrl);

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // Allow re-picking the same file later.
    e.target.value = "";
    if (!picked) return;
    const problem = validateImageFile(picked);
    if (problem) {
      onError(problem);
      return;
    }
    onError(null);
    onSelect(picked);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {resolvedUrl ? (
        <div className="flex items-center gap-4">
          <img src={resolvedUrl} alt="Product" className="h-24 w-24 rounded-control border border-border object-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <button
              type="button"
              onClick={openPicker}
              className="btn-secondary btn-tap w-full"
            >
              Replace photo
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="h-tap w-full rounded-control px-3 text-base font-semibold text-danger hover:bg-danger-soft"
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-control
                     border-2 border-dashed border-border-strong text-base font-semibold text-ink-soft hover:bg-surface-muted"
        >
          <ImagePlus className="h-7 w-7" strokeWidth={2} />
          Add a photo
          <span className="text-sm font-normal text-ink-faint">Take one or choose from your phone</span>
        </button>
      )}
    </div>
  );
}
