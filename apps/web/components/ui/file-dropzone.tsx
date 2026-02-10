"use client";

import * as React from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FileDropzoneProps = {
  onFiles: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  label?: string;
  helperText?: string;
  className?: string;
};

export function FileDropzone({
  onFiles,
  accept,
  maxFiles = 1,
  label = "Drop files here",
  helperText,
  className,
}: FileDropzoneProps) {
  const [files, setFiles] = React.useState<File[]>([]);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const nextFiles = acceptedFiles.slice(0, maxFiles);
      setFiles(nextFiles);
      onFiles(nextFiles);
    },
    [maxFiles, onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "surface-panel surface-panel-rail flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed border-border/70 px-6 py-8 text-center transition",
          isDragActive ? "border-brand/60 bg-brand/10" : "hover:border-brand/40"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isDragActive ? "Drop to upload" : label}
          </p>
          {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-bg-secondary px-4 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setFiles([]);
                  onFiles([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
