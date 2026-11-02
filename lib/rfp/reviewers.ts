import { createAdminSeed } from "@/config/admin-seed";

export interface ReviewerCandidate { id: string; name: string; title: string; departmentName: string }

let cache: ReviewerCandidate[] | null = null;

// 관리자 시드는 읽기만 한다. 활성 사용자만 검토자로 지정할 수 있다.
export function getReviewerCandidates(): ReviewerCandidate[] {
  if (cache) return cache;
  const seed = createAdminSeed();
  const departments = new Map(seed.departments.map((d) => [d.id, d.name]));
  cache = seed.users
    .filter((u) => u.status === "active" && u.deletedAt === null)
    .map((u) => ({ id: u.id, name: u.name, title: u.title, departmentName: (u.departmentId && departments.get(u.departmentId)) || "미지정" }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return cache;
}

export function filterReviewerCandidates(list: readonly ReviewerCandidate[], query: string): ReviewerCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  return list.filter((c) => (c.name + c.departmentName + c.title).toLowerCase().includes(q));
}
