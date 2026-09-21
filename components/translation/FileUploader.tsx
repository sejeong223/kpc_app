"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      // Simulate upload
      simulateUpload();
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/html': ['.html']
    },
    maxFiles: 1
  });

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          toast.success("파일 업로드가 완료되었습니다!");
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="flex flex-col items-stretch gap-3 h-full">
      <div
        {...getRootProps()}
        className={cn(
          "flex-1 relative border-2 border-dashed rounded-xl p-3 xl:p-4 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 group min-h-[100px] xl:min-h-[120px]",
          isDragActive
            ? "border-sky-500 bg-sky-50/50"
            : file
              ? "border-sky-200 bg-white"
              : "border-slate-200 hover:border-sky-400 hover:bg-sky-50/30"
        )}
      >
        <input {...getInputProps()} />

        {!file ? (
          <>
            <div className="w-8 h-8 xl:w-10 xl:h-10 bg-sky-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-4 h-4 xl:w-5 xl:h-5 text-sky-500" />
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-800 text-[11px] xl:text-xs">
                {isDragActive ? "파일을 놓으세요" : "파일을 업로드하세요"}
              </p>
              <p className="text-[9px] xl:text-[10px] text-slate-400">
                PDF, DOCX, XLSX 등
              </p>
            </div>
          </>
        ) : (
          <div className="w-full flex items-center gap-2 p-1.5 bg-sky-50/30 rounded-lg relative">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center border border-sky-100 shadow-sm shrink-0">
              <File className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <p className="text-[10px] xl:text-xs font-semibold text-slate-800 truncate">
                {file?.name}
              </p>
              {isUploading ? (
                <Progress value={uploadProgress} className="h-0.5 bg-sky-100" />
              ) : (
                <p className="text-[9px] text-slate-400">
                  {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} MB
                </p>
              )}
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="h-6 w-6 text-slate-400 hover:text-red-500 shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      <Button
        disabled={!file || isUploading}
        className={cn(
          "w-full h-10 xl:h-11 rounded-xl text-xs xl:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 shrink-0 shadow-sm",
          file && !isUploading
            ? "bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-100 text-white"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 xl:h-5 xl:w-5 animate-spin" />
            <span>번역 진행 중...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 xl:h-5 xl:w-5" />
            <span>번역 시작하기</span>
          </>
        )}
      </Button>
    </div>
  );
}
