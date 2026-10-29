export function makeCsv(headers: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string {
  const cell = (value: string | number | null): string => {
    let text = value === null ? "" : String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
