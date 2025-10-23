"use client";

import { useCallback, useRef, useState } from "react";

export default function Dropzone({
  onFile,
  accept = "application/pdf",
  label = "Drag & drop your PDF here or click to browse",
}: {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files.length) return;
      const f = files[0];
      if (accept && f.type !== accept) return;
      onFile(f);
    },
    [onFile, accept]
  );

  return (
    <>
      <div
        className={`dropzone card h-48 flex items-center justify-center text-center px-6 cursor-pointer ${dragOver ? "dragover" : ""}`}
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        aria-label="Upload PDF"
      >
        <div>
          <div className="hero">Add your PDF</div>
          <p className="text-muted mt-2">{label}</p>
          <p className="text-xs text-muted mt-1">We never upload your PDF. Hash is computed locally.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </>
  );
}
