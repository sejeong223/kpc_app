"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useAuthRuntime } from "@/components/providers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { appConfig } from "@/config/app";
import { APP_ROLES, hasRole } from "@/lib/auth/roles";
import type { GnbTab, UserRole } from "@/types/proposals";

export interface AppHeaderProps {
  activeTab: "proposals";
  onUnavailableTab(tab: Exclude<GnbTab, "proposals">): void;
  onShowToast(message: string): void;
}

interface HeaderNotification {
  id: number;
  title: string;
  text: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: HeaderNotification[] = [
  {
    id: 1,
    title: "AI 분석 완료",
    text: "공공기관 생성형 AI 플랫폼 구축 RFP 분석이 완료되었습니다.",
    time: "10분 전",
    read: false,
  },
  {
    id: 2,
    title: "댓글 알림",
    text: "김민수 님이 [3.3 보안 체계] 섹션에 새로운 댓글을 남겼습니다.",
    time: "35분 전",
    read: false,
  },
  {
    id: 3,
    title: "제안서 마감 임박",
    text: "한국교육진흥원 컨설팅 사업 제안서 마감이 24일 남았습니다.",
    time: "2시간 전",
    read: true,
  },
];

const HEADER_BUTTON_IDS: Partial<Record<GnbTab, string>> = {
  knowledge_ai: "gnb-knowledge-ai-btn",
  ai_worker: "gnb-ai-worker-btn",
  proposals: "gnb-proposals-btn",
  custom_ai: "gnb-custom-ai-btn",
  ai_agent: "gnb-ai-agent-btn",
  ai_community: "gnb-ai-community-btn",
};

export default function AppHeader({
  activeTab,
  onUnavailableTab,
  onShowToast,
}: AppHeaderProps): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const router = useRouter();
  const serverIsAdmin =
    authEnabled && session !== null && hasRole(session.user.roles, APP_ROLES.ADMIN);
  const [visualRole, setVisualRole] = useState<UserRole>(
    serverIsAdmin ? "admin" : authEnabled ? "user" : "admin",
  );
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<
    "notifications" | "settings"
  >("notifications");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [modelType, setModelType] = useState("Gemini 2.5 Flash (사내망 연동)");
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const profileRef = useRef<HTMLDivElement>(null);

  const displayName = session?.user.name?.trim() || "정소담";
  const displayEmail =
    session?.user.upn || session?.user.email || "jeongsodam0108@gmail.com";
  const usedTokens = 72_430;
  const totalQuota = 100_000;
  const usageRatio = usedTokens / totalQuota;
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTabChange = (tab: GnbTab) => {
    if (tab === "proposals") {
      router.push("/proposals");
      return;
    }
    onUnavailableTab(tab);
  };

  const handleRoleChange = (role: UserRole) => {
    setVisualRole(role);
    onShowToast(
      role === "admin"
        ? "🛡️ '관리자' 표시 모드로 전환되었습니다. 서버 권한은 변경되지 않습니다."
        : "👤 '일반사용자' 표시 모드로 전환되었습니다. 서버 권한은 변경되지 않습니다.",
    );
  };

  const markAllRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    onShowToast("모든 알림을 읽음 처리했습니다.");
  };

  const openAdminConsole = () => {
    setShowProfileMenu(false);
    if (serverIsAdmin) {
      router.push("/admin");
    } else {
      onShowToast("관리자 콘솔은 실제 Admin 권한이 있는 세션에서만 열 수 있습니다.");
    }
  };

  const logout = () => {
    setShowProfileMenu(false);
    if (authEnabled && session) {
      void signOut({ callbackUrl: "/", redirect: true });
    } else {
      onShowToast("인증 비활성화 목업 환경에서는 로그아웃하지 않습니다.");
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-14 select-none border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-full max-w-[1920px] items-center justify-between gap-4 px-5">
        <button
          type="button"
          onClick={() => handleTabChange("knowledge_ai")}
          className="group flex shrink-0 cursor-pointer items-center gap-3"
          aria-label="Knowledge AI로 이동"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E60012] text-sm font-black tracking-wider text-white shadow-xs">
            KPC
          </span>
          <span className="flex flex-col text-left">
            <span className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-[#111111]">KPC AI</span>
              <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                Enterprise
              </span>
            </span>
            <span className="-mt-0.5 text-[10px] font-medium text-neutral-600">
              한국생산성본부 인텔리전스 플랫폼
            </span>
          </span>
        </button>

        <div className="flex-1" />

        <div className="flex h-full items-center gap-2 sm:gap-3">
          <nav
            aria-label="KPC AI 주요 메뉴"
            className="scrollbar-none flex h-full items-center gap-0.5 overflow-x-auto sm:gap-1"
          >
            {appConfig.headerNavigation.map((item) => {
              const tab = item.id as GnbTab;
              const isActive = activeTab === tab;
              return (
                <button
                  key={item.id}
                  id={HEADER_BUTTON_IDS[tab]}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`relative flex h-full cursor-pointer items-center px-3.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
                    isActive
                      ? "font-bold text-[#111111]"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-[#111111]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute right-0 bottom-0 left-0 h-[2.5px] bg-[#E60012]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div ref={profileRef} className="relative">
            <button
              id="user-profile-badge"
              type="button"
              onClick={() => setShowProfileMenu((open) => !open)}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200/80 bg-white py-1.5 pr-2.5 pl-2 shadow-2xs transition-colors hover:bg-neutral-100 focus:outline-none"
              title="사용자 프로필, AI 사용량, 권한 테스트 및 알림"
              aria-expanded={showProfileMenu}
            >
              <span className="relative">
                <ProfileAvatar
                  authEnabled={authEnabled}
                  signedIn={session !== null}
                  displayName={displayName}
                  visualRole={visualRole}
                  compact
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#E60012] ring-2 ring-white" />
                )}
              </span>
              <span className="flex flex-col text-left">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs leading-tight font-bold text-[#111111]">
                    {displayName}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] leading-none font-bold ${
                      visualRole === "admin"
                        ? "border-red-200 bg-red-50 text-[#E60012]"
                        : "border-neutral-200 bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {visualRole === "admin" ? "관리자" : "일반"}
                  </span>
                </span>
                <span className="text-[10px] leading-none text-neutral-500">
                  {visualRole === "admin" ? "AI사업본부 수석" : "AI사업본부 선임"}
                </span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180 text-[#111111]" : ""
                }`}
              />
            </button>

            {showProfileMenu && (
              <div className="animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-2 w-92 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl duration-150">
                <div className="flex items-center justify-between bg-[#F8F9FA] p-4">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      authEnabled={authEnabled}
                      signedIn={session !== null}
                      displayName={displayName}
                      visualRole={visualRole}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#111111]">
                          {displayName} {visualRole === "admin" ? "수석연구원" : "선임연구원"}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                            visualRole === "admin"
                              ? "border-[#E60012]/20 bg-red-50 text-[#E60012]"
                              : "border-neutral-300 bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {visualRole === "admin" ? "관리자 (Admin)" : "일반사용자"}
                        </span>
                      </div>
                      <span className="mt-0.5 block text-[11px] text-neutral-500">
                        {visualRole === "admin"
                          ? "AI사업본부 · 생산성혁신TF (관리자)"
                          : "AI사업본부 · 실무 전담 (일반)"}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {displayEmail}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileMenu(false)}
                    className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700"
                    aria-label="프로필 메뉴 닫기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <TokenUsage
                  usedTokens={usedTokens}
                  totalQuota={totalQuota}
                  usageRatio={usageRatio}
                  onShowToast={onShowToast}
                  onClose={() => setShowProfileMenu(false)}
                />

                <div className="border-t border-neutral-100 bg-neutral-50/90 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <Sliders className="h-3.5 w-3.5 text-[#E60012]" /> 권한 테스트 모드
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-500">
                      현재: {visualRole === "admin" ? "관리자 (Admin)" : "일반 사용자"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-neutral-200/80 p-1">
                    <RoleButton
                      role="user"
                      currentRole={visualRole}
                      onClick={handleRoleChange}
                    />
                    <RoleButton
                      role="admin"
                      currentRole={visualRole}
                      onClick={handleRoleChange}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 bg-white p-2.5">
                  <button
                    type="button"
                    id="menu-my-profile-btn"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onShowToast("내 정보 화면은 현재 범위에 포함되지 않은 화면입니다.");
                    }}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-600 group-hover:bg-white">
                        <UserCheck className="h-3.5 w-3.5" />
                      </span>
                      내 정보 및 계정 상세
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-700" />
                  </button>
                  <button
                    type="button"
                    id="menu-admin-console-btn"
                    onClick={openAdminConsole}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-xl border border-red-200/80 bg-red-50/70 px-3 py-2.5 text-xs font-bold text-[#E60012] shadow-2xs transition-all hover:bg-red-50 hover:text-[#CC0010]"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E60012] text-white shadow-2xs">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex items-center gap-1.5">
                        관리자 콘솔
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-[#E60012]">
                          ADMIN
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#E60012] transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="flex border-b border-neutral-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveProfileTab("notifications")}
                    className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-bold transition-colors ${
                      activeProfileTab === "notifications"
                        ? "border-[#E60012] text-[#E60012]"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5" /> 업무 알림
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[#E60012] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProfileTab("settings")}
                    className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-bold transition-colors ${
                      activeProfileTab === "settings"
                        ? "border-[#E60012] text-[#E60012]"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" /> 환경 설정
                  </button>
                </div>

                {activeProfileTab === "notifications" ? (
                  <NotificationsPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onMarkAllRead={markAllRead}
                    onMarkRead={(id) =>
                      setNotifications((items) =>
                        items.map((item) => (item.id === id ? { ...item, read: true } : item)),
                      )
                    }
                  />
                ) : (
                  <SettingsPanel
                    modelType={modelType}
                    emailAlerts={emailAlerts}
                    soundAlerts={soundAlerts}
                    onModelTypeChange={(value) => {
                      setModelType(value);
                      onShowToast(`기본 AI 모델이 '${value}'(으)로 변경되었습니다.`);
                    }}
                    onToggleEmail={() => setEmailAlerts((enabled) => !enabled)}
                    onToggleSound={() => setSoundAlerts((enabled) => !enabled)}
                    onShowToast={onShowToast}
                  />
                )}

                <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 p-3">
                  <span className="text-[10px] text-neutral-400">KPC AI Enterprise v2.4</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-[#E60012]"
                  >
                    <LogOut className="h-3.5 w-3.5" /> 로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ProfileAvatar({
  authEnabled,
  signedIn,
  displayName,
  visualRole,
  compact = false,
}: {
  authEnabled: boolean;
  signedIn: boolean;
  displayName: string;
  visualRole: UserRole;
  compact?: boolean;
}): React.ReactElement {
  const roleColor = visualRole === "admin" ? "bg-[#E60012]" : "bg-neutral-800";
  return (
    <Avatar className={`${compact ? "h-7 w-7" : "h-10 w-10"} ${roleColor} text-white shadow-2xs`}>
      {authEnabled && signedIn && <AvatarImage src="/api/profile-image" alt={displayName} />}
      <AvatarFallback className={`${roleColor} ${compact ? "text-xs" : "text-sm"} font-bold text-white`}>
        {visualRole === "admin" ? (compact ? "관" : "관리자") : compact ? displayName.slice(0, 1) : "일반"}
      </AvatarFallback>
    </Avatar>
  );
}

function TokenUsage({
  usedTokens,
  totalQuota,
  usageRatio,
  onShowToast,
  onClose,
}: {
  usedTokens: number;
  totalQuota: number;
  usageRatio: number;
  onShowToast(message: string): void;
  onClose(): void;
}): React.ReactElement {
  return (
    <div className="space-y-2.5 bg-neutral-50/70 p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
          <Sparkles className="h-4 w-4 text-[#E60012]" /> 당월 AI Token 사용량
        </span>
        <span className="flex items-center gap-1">
          <strong className="text-xs font-extrabold text-[#E60012]">
            {Math.round(usageRatio * 100)}%
          </strong>
          <span className="text-[10px] text-neutral-400">소진</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            usageRatio >= 0.95
              ? "bg-[#E60012]"
              : usageRatio >= 0.8
                ? "bg-amber-500"
                : "bg-neutral-900"
          }`}
          style={{ width: `${usageRatio * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] text-neutral-500">
        <span>사용 <strong className="font-bold text-neutral-800">{(usedTokens / 1000).toFixed(1)}K</strong></span>
        <span>잔여 <strong className="font-bold text-neutral-800">{((totalQuota - usedTokens) / 1000).toFixed(1)}K</strong></span>
        <span>한도 <strong className="font-bold text-neutral-800">{(totalQuota / 1000).toFixed(0)}K Token</strong></span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          id="profile-view-usage-detail-btn"
          onClick={() => {
            onClose();
            onShowToast("사용량 상세 분석은 현재 범위에 포함되지 않은 화면입니다.");
          }}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-2xs transition-colors hover:bg-neutral-100"
        >
          <BarChart3 className="h-3.5 w-3.5 text-neutral-500" /> 사용량 상세 분석
        </button>
        <button
          type="button"
          id="profile-request-token-btn"
          onClick={() => {
            onClose();
            onShowToast("토큰 추가 신청이 접수되었습니다.");
          }}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-[#E60012] px-2 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-[#CC0010]"
        >
          <Sparkles className="h-3.5 w-3.5" /> 토큰 추가 신청
        </button>
      </div>
    </div>
  );
}

function RoleButton({
  role,
  currentRole,
  onClick,
}: {
  role: UserRole;
  currentRole: UserRole;
  onClick(role: UserRole): void;
}): React.ReactElement {
  const active = role === currentRole;
  return (
    <button
      type="button"
      id={`role-switch-${role}-btn`}
      onClick={() => onClick(role)}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
        active
          ? role === "admin"
            ? "bg-[#E60012] text-white shadow-xs"
            : "bg-white text-neutral-900 shadow-xs"
          : "text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      {role === "admin" ? "관리자 (Admin)" : "일반 사용자"}
    </button>
  );
}

function NotificationsPanel({
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
}: {
  notifications: HeaderNotification[];
  unreadCount: number;
  onMarkAllRead(): void;
  onMarkRead(id: number): void;
}): React.ReactElement {
  return (
    <div className="p-3">
      <div className="mb-1 flex items-center justify-between border-b border-neutral-100 pb-2">
        <span className="text-[11px] font-bold text-neutral-700">최근 도착한 업무 알림</span>
        {unreadCount > 0 && (
          <button type="button" onClick={onMarkAllRead} className="text-[11px] font-semibold text-[#E60012] hover:underline">
            모두 읽음
          </button>
        )}
      </div>
      <div className="max-h-64 space-y-1 divide-y divide-neutral-100 overflow-y-auto pr-0.5">
        {notifications.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onMarkRead(item.id)}
            className={`block w-full rounded-lg p-2.5 text-left transition-colors ${
              item.read
                ? "bg-white opacity-75 hover:bg-neutral-50"
                : "border border-red-100/50 bg-red-50/40 hover:bg-red-50/70"
            }`}
          >
            <span className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
                {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-[#E60012]" />}
                {item.title}
              </span>
              <span className="text-[10px] text-neutral-400">{item.time}</span>
            </span>
            <span className="block text-[11px] leading-relaxed text-neutral-600">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  modelType,
  emailAlerts,
  soundAlerts,
  onModelTypeChange,
  onToggleEmail,
  onToggleSound,
  onShowToast,
}: {
  modelType: string;
  emailAlerts: boolean;
  soundAlerts: boolean;
  onModelTypeChange(value: string): void;
  onToggleEmail(): void;
  onToggleSound(): void;
  onShowToast(message: string): void;
}): React.ReactElement {
  return (
    <div className="space-y-3.5 p-4 text-xs">
      <div className="space-y-1.5">
        <label htmlFor="profile-model-select" className="flex items-center gap-1 font-bold text-neutral-700">
          <Sparkles className="h-3.5 w-3.5 text-[#E60012]" /> 기본 생성 AI 엔진
        </label>
        <select
          id="profile-model-select"
          value={modelType}
          onChange={(event) => onModelTypeChange(event.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-[#F8F9FA] p-2 text-xs text-[#111111] focus:border-[#E60012] focus:outline-none"
        >
          <option value="Gemini 2.5 Flash (사내망 연동)">Gemini 2.5 Flash (초고속 권장)</option>
          <option value="Gemini 2.5 Pro (심층 제안 분석)">Gemini 2.5 Pro (정밀 추론)</option>
          <option value="KPC 온프레미스 망분리 모델">KPC 온프레미스 망분리 모델</option>
        </select>
      </div>
      <div className="space-y-2.5 border-t border-neutral-100 pt-2">
        <SettingToggle
          title="이메일 알림 연동"
          description="제안서 댓글 알림 및 주요 업데이트 메일 수신"
          enabled={emailAlerts}
          onClick={onToggleEmail}
        />
        <SettingToggle
          title="알림 효과음"
          description="작업 완료 시 사운드 알림"
          enabled={soundAlerts}
          onClick={onToggleSound}
        />
      </div>
      <button
        type="button"
        onClick={() => onShowToast("사내 DLP 보안 인증 토큰이 갱신되었습니다.")}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200"
      >
        <Shield className="h-3.5 w-3.5 text-emerald-600" /> 사내 보안 토큰 재검증
      </button>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  onClick,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onClick(): void;
}): React.ReactElement {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between text-left">
      <span>
        <span className="block font-semibold text-neutral-800">{title}</span>
        <span className="text-[10px] text-neutral-400">{description}</span>
      </span>
      {enabled ? (
        <ToggleRight className="h-6 w-6 text-[#E60012]" />
      ) : (
        <ToggleLeft className="h-6 w-6 text-neutral-400" />
      )}
    </button>
  );
}
