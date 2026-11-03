"use client";
import { diffLines, contentText } from "@/lib/workspace/production/diff";
import type { ContentBlock } from "@/types/workspace-production";
export default function ContentDiff({
  before,
  after,
}: {
  before: string | ContentBlock;
  after: string | ContentBlock;
}) {
  const lines = diffLines(contentText(before), contentText(after)),
    table = (values: typeof lines) => (
      <div className="tw:overflow-auto">
        <table className="tw:w-full tw:table-fixed tw:text-left tw:text-xs">
          <thead>
            <tr>
              <th>이전 내용 (−)</th>
              <th>제안 내용 (+)</th>
            </tr>
          </thead>
          <tbody>
            {values.map((line) => (
              <tr key={line.index}>
                <td
                  className={
                    "tw:whitespace-pre-wrap tw:break-words tw:p-2 " +
                    (line.changed ? "tw:bg-red-50" : "")
                  }
                >
                  {line.changed ? "− " : ""}
                  {line.before === null
                    ? "(없음)"
                    : line.before === ""
                      ? "(빈 줄)"
                      : line.before}
                </td>
                <td
                  className={
                    "tw:whitespace-pre-wrap tw:break-words tw:p-2 " +
                    (line.changed ? "tw:bg-emerald-50" : "")
                  }
                >
                  {line.changed ? "+ " : ""}
                  {line.after === null
                    ? "(없음)"
                    : line.after === ""
                      ? "(빈 줄)"
                      : line.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <>
      {table(lines.slice(0, 60))}
      {lines.length > 60 && (
        <details>
          <summary>
            나머지 {lines.length - 60}줄 비교 펼치기 (현재 앞 60줄만 표시)
          </summary>
          {table(lines.slice(60))}
        </details>
      )}
    </>
  );
}
