import { createAdminSeed } from "@/config/admin-seed";
import type { AdminRole } from "@/lib/admin/schemas";

export interface ReviewerCandidate {
  id: string; name: string; title: string; departmentName: string;
  role: AdminRole;
  photoUrl: string | null; // Entra ID 사진 연동 전까지 항상 null
}

let cache: ReviewerCandidate[] | null = null;

// 관리자 시드는 읽기만 한다. 활성 사용자만 검토자로 지정할 수 있다.
export function getReviewerCandidates(): ReviewerCandidate[] {
  if (cache) return cache;
  const seed = createAdminSeed();
  const departments = new Map(seed.departments.map((d) => [d.id, d.name]));
  cache = seed.users
    .filter((u) => u.status === "active" && u.deletedAt === null)
    .map((u) => ({ id: u.id, name: u.name, title: u.title, departmentName: (u.departmentId && departments.get(u.departmentId)) || "미지정", role: u.role, photoUrl: null }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return cache;
}

export function filterReviewerCandidates(list: readonly ReviewerCandidate[], query: string): ReviewerCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  return list.filter((c) => (c.name + c.departmentName + c.title).toLowerCase().includes(q));
}

/** 레퍼런스 revItems 순서: 고정된 지정자 → 같은 부서 → 이름 가나다. 원본은 바꾸지 않는다. */
export function sortReviewerCandidates(
  list: readonly ReviewerCandidate[],
  options: { pinnedIds: ReadonlySet<string>; department: string | null },
): ReviewerCandidate[] {
  return [...list].sort((a, b) =>
    Number(options.pinnedIds.has(b.id)) - Number(options.pinnedIds.has(a.id))
    || Number(b.departmentName === options.department) - Number(a.departmentName === options.department)
    || a.name.localeCompare(b.name, "ko"));
}
