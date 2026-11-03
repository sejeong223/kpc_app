import type { SkillRules } from "@/lib/skills/schema";
import { PAGE_TYPES, PAGE_LABEL } from "@/config/skill-options";
import { workspaceTable } from "../shared/WorkspaceUi";
export default function SkillRuleSummary({ rules: r }: { rules: SkillRules }) {
  const rows = [
    ["글꼴", r.font.family],
    [
      "제목 / 리드 / 본문",
      [r.font.title, r.font.sub, r.font.body]
        .map((v) => v[0] + "pt · " + v[1])
        .join(" / "),
    ],
    ["줄 간격", String(r.font.lh)],
    [
      "간격",
      "제목·본문 " +
        r.gap.tb +
        "cm / 본문·표 " +
        r.gap.bt +
        "cm / 문단 " +
        r.gap.para +
        "pt",
    ],
    [
      "표",
      "안쪽 여백 상하 " +
        r.table.padV +
        "cm · 좌우 " +
        r.table.padH +
        "cm / 행 높이 " +
        r.table.rowH +
        "cm / 텍스트 " +
        r.table.text +
        " / 숫자 " +
        r.table.num +
        " / 머리글 " +
        r.table.head,
    ],
    [
      "여백",
      r.mg
        .map((v, i) => ["상", "좌", "하", "우"][i] + " " + v + "cm")
        .join(" · "),
    ],
    ["안내선·눈금", r.cols + "열 · " + r.rows + "단 / " + r.grid + "cm"],
    [
      "배치",
      "스냅 " +
        r.shape.snap +
        " / 이미지 " +
        r.shape.img +
        " / 정렬 " +
        r.shape.align +
        " / 최소 폭 " +
        r.shape.min,
    ],
    [
      "넘침 규칙",
      "축소 " +
        r.guard.shrink +
        " · 분할 " +
        r.guard.split +
        " · 겹침 " +
        r.guard.overlap +
        " · 안내선 내부 " +
        r.guard.inGuide +
        " · 표 최대 " +
        r.guard.tableRows +
        "행",
    ],
  ];
  return (
    <>
      <dl className="tw:grid tw:grid-cols-[auto_1fr] tw:gap-2 tw:text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="tw:contents">
            <dt className="tw:font-semibold">{label}</dt>
            <dd className="tw:m-0">{value}</dd>
          </div>
        ))}
      </dl>
      <table className={workspaceTable}>
        <thead>
          <tr>
            <th>페이지 유형</th>
            <th>제목 / 본문 / 줄간격</th>
            <th>정렬·규칙</th>
          </tr>
        </thead>
        <tbody>
          {PAGE_TYPES.map((type) => (
            <tr key={type}>
              <td>{PAGE_LABEL[type]}</td>
              <td>
                {r.pt[type].title ?? "상속"} / {r.pt[type].body ?? "상속"} /{" "}
                {r.pt[type].lh ?? "상속"}
              </td>
              <td>
                {r.pt[type].align} · {r.pt[type].rule}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tw:text-xs tw:text-(--kpc-muted)">
        서식 설정입니다. 실제 적용은 지원 요소와 레이아웃 검증을 통과한 경우에만
        저장됩니다.
      </p>
    </>
  );
}
