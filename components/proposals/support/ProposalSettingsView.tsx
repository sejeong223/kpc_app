"use client";

import { useState } from "react";
import { Bell, Bot, FilePlus2, LayoutTemplate, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_PROPOSAL_AI_POLICY,
  DEFAULT_PROPOSAL_NOTIFICATIONS,
  MOCK_PROPOSAL_MEMBERS,
  MOCK_PROPOSAL_TEMPLATES,
} from "@/data/proposals/mock-data";
import type { ProposalAiPolicy, ProposalMember, ProposalNotificationSettings, ProposalTemplate } from "@/types/proposals";

interface ProposalSettingsViewProps {
  canReview: boolean;
}

type SettingsTab = "team" | "templates" | "ai" | "notifications";
const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Users }> = [
  { id: "team", label: "팀원 및 권한", icon: Users },
  { id: "templates", label: "제안 템플릿", icon: LayoutTemplate },
  { id: "ai", label: "AI 작성 정책", icon: Bot },
  { id: "notifications", label: "알림", icon: Bell },
];

export default function ProposalSettingsView({ canReview }: ProposalSettingsViewProps): React.ReactElement {
  const [tab, setTab] = useState<SettingsTab>("team");
  const [members, setMembers] = useState<ProposalMember[]>(() => MOCK_PROPOSAL_MEMBERS.map((member) => ({ ...member })));
  const [templates, setTemplates] = useState<ProposalTemplate[]>(() => MOCK_PROPOSAL_TEMPLATES.map((template) => ({ ...template })));
  const [policy, setPolicy] = useState<ProposalAiPolicy>({ ...DEFAULT_PROPOSAL_AI_POLICY });
  const [notifications, setNotifications] = useState<ProposalNotificationSettings>({ ...DEFAULT_PROPOSAL_NOTIFICATIONS });
  const permissionReason = "관리자만 변경할 수 있습니다.";

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6"><div className="mx-auto max-w-5xl"><header><h1 className="text-2xl font-bold">제안 설정</h1><p className="mt-1 text-sm text-[#77787E]">현재 browser session에서만 적용되는 목업 설정입니다.</p></header><div className="mt-5 grid gap-4 md:grid-cols-[210px_minmax(0,1fr)]"><nav className="space-y-1 rounded-md border bg-white p-2" aria-label="제안 설정">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={`flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm ${tab === item.id ? "bg-[#FFF1F2] font-semibold text-kpc-red" : "text-[#5F6066] hover:bg-[#F5F6F7]"}`} onClick={() => setTab(item.id)}><Icon className="size-4" />{item.label}</button>; })}</nav><div className="rounded-md border bg-white p-5">
          {tab === "team" && <section><div className="flex items-center justify-between"><div><h2 className="font-semibold">팀원 및 권한</h2><p className="mt-1 text-xs text-[#85868B]">정소담은 현재 mock 사용자로 제거할 수 없습니다.</p></div><Button variant="outline" onClick={() => { if (!members.some((member) => member.id === "member-new")) setMembers((current) => [...current, { id: "member-new", name: "한민재", department: "AI사업본부", role: "작성자", email: "minjae.han@kpc.or.kr" }]); }}><Plus className="size-4" /> 팀원 추가</Button></div><div className="mt-4 space-y-2">{members.map((member) => <article key={member.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3"><span className="flex size-9 items-center justify-center rounded-full bg-[#F0F1F3] text-xs font-bold">{member.name.slice(0, 1)}</span><div className="min-w-40 flex-1"><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-[#85868B]">{member.department} · {member.email}</p></div><select className="h-8 rounded-md border px-2 text-xs" value={member.role} disabled={!canReview} title={!canReview ? permissionReason : undefined} aria-label={`${member.name} 권한`} onChange={(event) => setMembers((current) => current.map((item) => item.id === member.id ? { ...item, role: event.target.value as ProposalMember["role"] } : item))}>{["PM", "작성자", "검토자"].map((role) => <option key={role} value={role}>{role}</option>)}</select><Button size="icon" variant="ghost" title={member.id === "member-current" ? "현재 사용자는 제거할 수 없습니다." : !canReview ? permissionReason : "팀원 제거"} disabled={member.id === "member-current" || !canReview} onClick={() => setMembers((current) => current.filter((item) => item.id !== member.id))}><Trash2 className="size-4" /></Button></article>)}</div></section>}
          {tab === "templates" && <section><div className="flex items-center justify-between"><div><h2 className="font-semibold">제안 템플릿</h2><p className="mt-1 text-xs text-[#85868B]">기본 템플릿은 항상 하나만 유지됩니다.</p></div><Button variant="outline" onClick={() => setTemplates((current) => [...current, { id: `template-${Date.now()}`, name: `새 제안 템플릿 ${current.length + 1}`, description: "사용자 정의 목업 템플릿", isDefault: false, updatedAt: "2026.09.22" }])}><FilePlus2 className="size-4" /> 템플릿 생성</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{templates.map((template) => <article key={template.id} className={`rounded-md border p-4 ${template.isDefault ? "border-kpc-red bg-[#FFF9F9]" : ""}`}><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{template.name}</h3>{template.isDefault && <span className="rounded-full bg-kpc-red px-2 py-1 text-[10px] text-white">기본</span>}</div><p className="mt-2 text-xs leading-5 text-[#77787E]">{template.description}</p><div className="mt-4 flex justify-between"><Button size="sm" variant="outline" disabled={template.isDefault} onClick={() => setTemplates((current) => current.map((item) => ({ ...item, isDefault: item.id === template.id })))}>기본으로 설정</Button><Button size="icon" variant="ghost" disabled={!canReview || template.isDefault} title={!canReview ? permissionReason : template.isDefault ? "기본 템플릿은 삭제할 수 없습니다." : "템플릿 삭제"} onClick={() => setTemplates((current) => current.filter((item) => item.id !== template.id))}><Trash2 className="size-4" /></Button></div></article>)}</div></section>}
          {tab === "ai" && <section><h2 className="font-semibold">AI 작성 정책</h2>{!canReview && <p className="mt-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">{permissionReason} 설정은 확인만 할 수 있습니다.</p>}<div className="mt-4 space-y-4"><label className="block text-sm">모델 표시<select className="mt-2 h-9 w-full rounded-md border px-3" value={policy.modelLabel} onChange={(event) => setPolicy((current) => ({ ...current, modelLabel: event.target.value }))}><option>KPC 표준 생성 모델</option><option>KPC 고정밀 생성 모델</option></select></label><SettingSwitch label="웹 검색 허용" checked={policy.allowWebSearch} onChange={(allowWebSearch) => setPolicy((current) => ({ ...current, allowWebSearch }))} /><SettingSwitch label="출처 표기 필수" checked={policy.requireCitation} onChange={(requireCitation) => setPolicy((current) => ({ ...current, requireCitation }))} /><label className="block text-sm">월간 최대 token<Input className="mt-2" type="number" min={0} value={policy.maxMonthlyTokens} onChange={(event) => setPolicy((current) => ({ ...current, maxMonthlyTokens: Number(event.target.value) }))} /></label><Button disabled={!canReview} title={!canReview ? permissionReason : undefined} className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => toast.success("AI 작성 정책을 session에 저장했습니다.")}>정책 저장</Button></div></section>}
          {tab === "notifications" && <section><h2 className="font-semibold">개인 알림</h2><div className="mt-4 space-y-4"><SettingSwitch label="마감일 임박" checked={notifications.deadline} onChange={(deadline) => setNotifications((current) => ({ ...current, deadline }))} /><SettingSwitch label="새 댓글" checked={notifications.comments} onChange={(comments) => setNotifications((current) => ({ ...current, comments }))} /><SettingSwitch label="검토 요청" checked={notifications.reviewRequests} onChange={(reviewRequests) => setNotifications((current) => ({ ...current, reviewRequests }))} /><SettingSwitch label="분석 완료" checked={notifications.analysisComplete} onChange={(analysisComplete) => setNotifications((current) => ({ ...current, analysisComplete }))} /><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => toast.success("개인 알림 설정을 session에 저장했습니다.")}>알림 저장</Button></div></section>}
        </div></div></div></section>
  );
}

function SettingSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange(value: boolean): void }): React.ReactElement {
  return <label className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>;
}