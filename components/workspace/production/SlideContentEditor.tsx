"use client";
import {
  DadamButton,
  DadamInput,
  DadamTextarea,
} from "@/components/ui/DadamControls";
import type { ContentBlock, SlideContent } from "@/types/workspace-production";
import { WORKSPACE_LIMITS as L } from "@/config/workspace-production";
import { WorkspaceErrorText, workspaceCard } from "../shared/WorkspaceUi";
export interface SlideContentEditorProps {
  value: SlideContent;
  readOnly: boolean;
  error: string | null;
  onChange(value: SlideContent): void;
  onSave(): void;
  busy?: boolean;
  onImage?(file: File): void;
}
export default function SlideContentEditor({
  value,
  readOnly,
  error,
  onChange,
  onSave,
  busy = false,
  onImage,
}: SlideContentEditorProps) {
  const setBlock = (block: ContentBlock) =>
      onChange({
        ...value,
        blocks: value.blocks.map((b) => (b.id === block.id ? block : b)),
      }),
    move = (index: number, delta: number) => {
      const blocks = [...value.blocks];
      [blocks[index], blocks[index + delta]] = [
        blocks[index + delta],
        blocks[index],
      ];
      onChange({ ...value, blocks });
    };
  const add = (kind: "text" | "list" | "table") => {
    const id = crypto.randomUUID(),
      block: ContentBlock =
        kind === "text"
          ? { id, kind, text: "" }
          : kind === "list"
            ? { id, kind, items: [""] }
            : { id, kind, columns: ["항목", "내용"], rows: [["", ""]] };
    onChange({ ...value, blocks: [...value.blocks, block] });
  };
  return (
    <section className={workspaceCard}>
      <fieldset
        disabled={readOnly || busy}
        className="tw:m-0 tw:min-w-0 tw:space-y-3 tw:border-0 tw:p-0"
      >
        <label className="tw:block">
          제목
          <DadamInput
            className="tw:w-full"
            value={value.title}
            maxLength={L.title}
            readOnly={readOnly}
            onChange={(_, d) => onChange({ ...value, title: d.value })}
          />
        </label>
        <label className="tw:block">
          리딩 메시지
          <DadamTextarea
            className="tw:w-full"
            value={value.lead}
            maxLength={L.lead}
            readOnly={readOnly}
            onChange={(_, d) => onChange({ ...value, lead: d.value })}
          />
        </label>
        {value.blocks.map((block, index) => (
          <article
            key={block.id}
            className="tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"
          >
            <header className="tw:mb-2 tw:flex tw:flex-wrap tw:items-center tw:gap-1">
              <strong className="tw:mr-auto tw:text-xs">
                {index + 1}.{" "}
                {
                  { text: "본문", list: "목록", table: "표", image: "이미지" }[
                    block.kind
                  ]
                }
              </strong>
              {!readOnly && (
                <>
                  <DadamButton
                    size="small"
                    aria-label={"블록 " + (index + 1) + " 위로"}
                    disabled={index === 0 || busy}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </DadamButton>
                  <DadamButton
                    size="small"
                    aria-label={"블록 " + (index + 1) + " 아래로"}
                    disabled={index === value.blocks.length - 1 || busy}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </DadamButton>
                  <DadamButton
                    size="small"
                    onClick={() =>
                      onChange({
                        ...value,
                        blocks: value.blocks.filter((b) => b.id !== block.id),
                      })
                    }
                  >
                    블록 삭제
                  </DadamButton>
                </>
              )}
            </header>
            {block.kind === "text" && (
              <DadamTextarea
                aria-label={"본문 " + (index + 1)}
                className="tw:min-h-28 tw:w-full"
                value={block.text}
                maxLength={L.text}
                readOnly={readOnly}
                onChange={(_, d) => setBlock({ ...block, text: d.value })}
              />
            )}
            {block.kind === "list" && (
              <>
                <ol className="tw:space-y-2 tw:pl-5">
                  {block.items.map((text, i) => (
                    <li key={i}>
                      <div className="tw:flex tw:gap-1">
                        <DadamInput
                          aria-label={
                            "목록 " + (index + 1) + " 항목 " + (i + 1)
                          }
                          value={text}
                          maxLength={L.itemText}
                          readOnly={readOnly}
                          onChange={(_, d) =>
                            setBlock({
                              ...block,
                              items: block.items.map((t, j) =>
                                j === i ? d.value : t,
                              ),
                            })
                          }
                        />
                        {!readOnly && (
                          <>
                            <DadamButton
                              size="small"
                              disabled={i === 0}
                              aria-label={"목록 항목 " + (i + 1) + " 위로"}
                              onClick={() => {
                                const items = [...block.items];
                                [items[i - 1], items[i]] = [
                                  items[i],
                                  items[i - 1],
                                ];
                                setBlock({ ...block, items });
                              }}
                            >
                              ↑
                            </DadamButton>
                            <DadamButton
                              size="small"
                              disabled={i === block.items.length - 1}
                              aria-label={"목록 항목 " + (i + 1) + " 아래로"}
                              onClick={() => {
                                const items = [...block.items];
                                [items[i + 1], items[i]] = [
                                  items[i],
                                  items[i + 1],
                                ];
                                setBlock({ ...block, items });
                              }}
                            >
                              ↓
                            </DadamButton>
                            <DadamButton
                              size="small"
                              disabled={block.items.length <= 1}
                              aria-label={"목록 항목 " + (i + 1) + " 삭제"}
                              onClick={() =>
                                setBlock({
                                  ...block,
                                  items: block.items.filter((_, j) => j !== i),
                                })
                              }
                            >
                              ×
                            </DadamButton>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {!readOnly && (
                  <DadamButton
                    size="small"
                    disabled={block.items.length >= L.listItems}
                    onClick={() =>
                      setBlock({ ...block, items: [...block.items, ""] })
                    }
                  >
                    항목 추가
                  </DadamButton>
                )}
              </>
            )}
            {block.kind === "table" && (
              <>
                <div className="tw:overflow-x-auto">
                  <table className="tw:w-full tw:border-collapse">
                    <thead>
                      <tr>
                        {block.columns.map((name, col) => (
                          <th key={col}>
                            <DadamInput
                              aria-label={
                                "표 " +
                                (index + 1) +
                                " 열 " +
                                (col + 1) +
                                " 이름"
                              }
                              value={name}
                              maxLength={L.itemText}
                              readOnly={readOnly}
                              onChange={(_, d) =>
                                setBlock({
                                  ...block,
                                  columns: block.columns.map((v, j) =>
                                    j === col ? d.value : v,
                                  ),
                                })
                              }
                            />
                            {!readOnly && (
                              <DadamButton
                                size="small"
                                disabled={block.columns.length === 1}
                                aria-label={"열 " + (col + 1) + " 삭제"}
                                onClick={() =>
                                  setBlock({
                                    ...block,
                                    columns: block.columns.filter(
                                      (_, j) => j !== col,
                                    ),
                                    rows: block.rows.map((row) =>
                                      row.filter((_, j) => j !== col),
                                    ),
                                  })
                                }
                              >
                                열 삭제
                              </DadamButton>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c}>
                              <DadamTextarea
                                aria-label={
                                  "표 " +
                                  (index + 1) +
                                  " " +
                                  (r + 1) +
                                  "행 " +
                                  (c + 1) +
                                  "열"
                                }
                                value={cell}
                                maxLength={L.itemText}
                                readOnly={readOnly}
                                onChange={(_, d) =>
                                  setBlock({
                                    ...block,
                                    rows: block.rows.map((a, i) =>
                                      i === r
                                        ? a.map((v, j) =>
                                            j === c ? d.value : v,
                                          )
                                        : a,
                                    ),
                                  })
                                }
                              />
                            </td>
                          ))}
                          {!readOnly && (
                            <td>
                              <DadamButton
                                size="small"
                                disabled={block.rows.length === 1}
                                aria-label={r + 1 + "행 삭제"}
                                onClick={() =>
                                  setBlock({
                                    ...block,
                                    rows: block.rows.filter((_, j) => j !== r),
                                  })
                                }
                              >
                                ×
                              </DadamButton>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!readOnly && (
                  <div className="tw:mt-2 tw:flex tw:gap-1">
                    <DadamButton
                      disabled={block.columns.length >= L.columns}
                      onClick={() =>
                        setBlock({
                          ...block,
                          columns: [...block.columns, "새 열"],
                          rows: block.rows.map((r) => [...r, ""]),
                        })
                      }
                    >
                      열 추가
                    </DadamButton>
                    <DadamButton
                      disabled={block.rows.length >= L.rows}
                      onClick={() =>
                        setBlock({
                          ...block,
                          rows: [...block.rows, block.columns.map(() => "")],
                        })
                      }
                    >
                      행 추가
                    </DadamButton>
                  </div>
                )}
              </>
            )}
            {block.kind === "image" && (
              <>
                <p>
                  {block.mime} · {block.width} × {block.height}px
                </p>
                <label>
                  대체 설명
                  <DadamInput
                    value={block.alt}
                    readOnly={readOnly}
                    onChange={(_, d) => setBlock({ ...block, alt: d.value })}
                  />
                </label>
                <p className="tw:text-xs">
                  Template 이미지 칸에 연결한 뒤 구조 미리보기에서 확인하세요.
                </p>
              </>
            )}
          </article>
        ))}
        {!readOnly && (
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            <DadamButton
              disabled={value.blocks.length >= L.blocks}
              onClick={() => add("text")}
            >
              본문 추가
            </DadamButton>
            <DadamButton
              disabled={value.blocks.length >= L.blocks}
              onClick={() => add("list")}
            >
              목록 추가
            </DadamButton>
            <DadamButton
              disabled={value.blocks.length >= L.blocks}
              onClick={() => add("table")}
            >
              표 추가
            </DadamButton>
            {onImage && (
              <label className="tw:text-sm">
                이미지 업로드
                <input
                  type="file"
                  aria-label="PNG 또는 JPEG 이미지"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <DadamButton appearance="primary" disabled={busy} onClick={onSave}>
              내용 저장
            </DadamButton>
          </div>
        )}
      </fieldset>
      <WorkspaceErrorText error={error} />
    </section>
  );
}
