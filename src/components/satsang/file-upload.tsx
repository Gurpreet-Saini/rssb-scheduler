"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
  isProcessing: boolean;
}

export function FileUpload({ onFileAccepted, isProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      setSelectedFile(file);
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <Card
      className={`border-2 border-dashed transition-all duration-300 ${
        dragActive
          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 scale-[1.01]"
          : selectedFile
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-gray-300 dark:border-gray-700 hover:border-gray-400"
      }`}
    >
      <CardContent className="p-8">
        {selectedFile && !isProcessing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center gap-4 cursor-pointer py-4 ${
              isProcessing ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                dragActive
                  ? "bg-amber-100 dark:bg-amber-900/40"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <Upload
                className={`h-8 w-8 transition-colors ${
                  dragActive
                    ? "text-amber-600"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isProcessing
                  ? "Processing your file..."
                  : dragActive
                  ? "Drop your Excel file here"
                  : "Drag & drop your Excel file here"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or <span className="text-amber-600 font-medium">browse</span> to
                choose a file (.xlsx, .xls)
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
              disabled={isProcessing}
            />
          </label>
        )}

        {isProcessing && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-full animate-pulse rounded-full bg-amber-500 w-2/3" />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground animate-pulse">
              Parsing schedule data...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
