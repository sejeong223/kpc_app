"use client";
import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { ALLOWED_FILE_EXTENSIONS } from "@/config/workspace-files";
import type { FileCategory } from "@/types/workspace-files";
export interface FilePickerScope {
    projectId: string;
    round: number;
    revision: number;
    category: Exclude<FileCategory, "web">;
}
export interface FilePickerResult {
    scope: FilePickerScope;
    files: File[];
}
export function useFilePicker(onSelected: (result: FilePickerResult) => void) {
    const inputRef = useRef<HTMLInputElement>(null), pending = useRef<FilePickerScope | null>(null);
    useEffect(() => { const input = inputRef.current; const cancel = () => { pending.current = null; }; input?.addEventListener("cancel", cancel); return () => { pending.current = null; input?.removeEventListener("cancel", cancel); }; }, []);
    const inputProps: InputHTMLAttributes<HTMLInputElement> = { type: "file", multiple: true, hidden: true, accept: ALLOWED_FILE_EXTENSIONS.join(","),
        onChange: event => { const scope = pending.current, files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; pending.current = null; if (scope && files.length)
            onSelected({ scope, files }); },
    };
    return { inputRef, inputProps, open: (scope: FilePickerScope) => { const input = inputRef.current; if (!input)
            return; pending.current = { ...scope }; input.value = ""; input.click(); } };
}
