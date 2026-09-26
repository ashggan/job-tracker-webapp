"use client";

import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { cn } from "cn";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";

// A styled drag-and-drop zone around a real (visually hidden, not
// display:none) <input type="file">, so a parent <form> that reads
// `new FormData(event.currentTarget)` on submit needs no changes at all --
// this is a drop-in replacement for a plain <Input type="file">, not a
// separate upload mechanism a caller has to wire up.
export function FileDropzone({
  name,
  accept,
  label,
  hint,
  required,
  disabled,
}: {
  name: string;
  accept?: string;
  label?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (!file || !inputRef.current) return;

    // Assigns the dropped file to the real input's FileList, so it's picked
    // up by a plain FormData read exactly like a click-to-browse selection.
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputRef.current.files = dataTransfer.files;
    setFileName(file.name);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors",
          isDragOver && "border-accent-foreground bg-accent/40",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-[13px]">
          {fileName ? (
            <span className="font-semibold text-foreground">{fileName}</span>
          ) : (
            <>
              Drag a file here, or <span className="text-accent-foreground underline">browse</span>
            </>
          )}
        </p>
        {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        // A parent calling form.reset() (e.g. after a successful upload)
        // clears the native input's files but wouldn't otherwise touch this
        // component's own displayed filename -- the "reset" event bubbles
        // from the <form>, so this stays in sync with no extra wiring
        // required from the caller.
        onReset={() => setFileName(null)}
      />
    </div>
  );
}
