"use client";

import React, { useState } from 'react';
import {
  Settings,
  Sparkles,
  Bell,
  FileText,
  ShieldCheck,
  Save,
  CheckCircle2,
  Cpu,
  User,
  Clock,
  Lock,
  Users,
  Plus,
  Trash2,
  Check,
  DollarSign,
  Activity,
  History,
  BarChart2,
  X,
  Layers,
  Building,
  CheckSquare
} from 'lucide-react';
import type { ProposalProject, UserRole } from '@/types/proposals';

export interface ProposalSettingsViewProps {
  activeProject?: ProposalProject | null;
  onUpdateProject?: (updated: ProposalProject) => void;
  userRole?: UserRole;
  onShowToast: (msg: string) => void;
}

interface TeamMemberItem {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  role: 'PM' | '선임 작성자' | '작성자' | '검토자' | '뷰어';
  assignedSectionsCount: number;
  joinedDate: string;
  status: '참여 중' | '초대 대기';
}

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  isDefault: boolean;
  updatedAt: string;
  sectionsCount: number;
}

interface SkillItem {
  id: string;
  name: string;
  description: string;
  promptGuide: string;
  isDefault: boolean;
  category: '문체/격식' | '보안/규정' | '성과/실적' | '검증/평가';
  updatedAt: string;
}

interface ActivityLogItem {
  id: string;
  user: string;
  userEmail: string;
  action: string;
  targetSection: string;
  timestamp: string;
  details: string;
  category: '작성' | '검토' | 'AI생성' | '문서업로드' | '설정변경' | '권한배정';
  isCurrentUserRelated: boolean;
}

export const ProposalSettingsView: React.FC<ProposalSettingsViewProps> = ({
  activeProject,
  onUpdateProject,
  userRole = 'admin',
  onShowToast
}) => {
  const currentUserName = '정소담';
  const currentUserRoleName = '작성자';

  // Active Sub-Tab within Project Settings
  const [activeTab, setActiveTab] = useState<
    'members' | 'templates_skills' | 'ai_policy' | 'activity_logs' | 'cost_usage' | 'notifications'
  >('members');

  // Sub-tab for Templates & Skills
  const [templateSkillSubTab, setTemplateSkillSubTab] = useState<'templates' | 'skills'>('templates');

  // ==========================================
  // 1. 팀원 및 권한 관리 상태
  // ==========================================
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([
    {
      id: 'mem-1',
      name: '정소담',
      department: 'AI사업본부',
      position: '선임연구원',
      email: 'sodam.jeong@kpc.or.kr',
      role: '작성자',
      assignedSectionsCount: 3,
      joinedDate: '2026.09.10',
      status: '참여 중'
    },
    {
      id: 'mem-2',
      name: '김민수',
      department: 'AI산업본부',
      position: '수석연구원',
      email: 'ms.kim@kpc.or.kr',
      role: 'PM',
      assignedSectionsCount: 2,
      joinedDate: '2026.09.08',
      status: '참여 중'
    },
    {
      id: 'mem-3',
      name: '박지훈',
      department: '컨설팅본부',
      position: '책임연구원',
      email: 'jh.park@kpc.or.kr',
      role: '선임 작성자',
      assignedSectionsCount: 4,
      joinedDate: '2026.09.11',
      status: '참여 중'
    },
    {
      id: 'mem-4',
      name: '이서연',
      department: '교육사업본부',
      position: '선임연구원',
      email: 'sy.lee@kpc.or.kr',
      role: '검토자',
      assignedSectionsCount: 5,
      joinedDate: '2026.09.12',
      status: '참여 중'
    },
    {
      id: 'mem-5',
      name: '최유진',
      department: 'CX본부',
      position: '연구원',
      email: 'yj.choi@kpc.or.kr',
      role: '뷰어',
      assignedSectionsCount: 0,
      joinedDate: '2026.09.14',
      status: '초대 대기'
    }
  ]);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteDept, setInviteDept] = useState('AI산업본부');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'PM' | '선임 작성자' | '작성자' | '검토자' | '뷰어'>('작성자');

  // Toggle Project Team Members Invitation (ActiveProject.teamInvited)
  const isTeamInvited = activeProject?.teamInvited ?? true;

  const handleToggleTeamInvited = () => {
    if (userRole !== 'admin') {
      onShowToast('팀원 초대 및 프로젝트 접근 권한 제어는 프로젝트 관리자만 가능합니다.');
      return;
    }
    const newStatus = !isTeamInvited;
    if (activeProject && onUpdateProject) {
      onUpdateProject({
        ...activeProject,
        teamInvited: newStatus
      });
    }
    if (newStatus) {
      onShowToast('🎉 팀원 전체 초대가 완료되었습니다. 이제 일반 팀원들이 제안서 작성에 접근할 수 있습니다.');
    } else {
      onShowToast('팀원 접근 권한이 일시 회수되었습니다. (일반 팀원 접근 대기 화면 전환)');
    }
  };

  const handleUpdateMemberRole = (memberId: string, newRole: TeamMemberItem['role']) => {
    if (userRole !== 'admin') {
      onShowToast('팀원 권한 변경은 프로젝트 관리자만 가능합니다.');
      return;
    }
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    const target = teamMembers.find(m => m.id === memberId);
    onShowToast(`'${target?.name || '팀원'}' 님의 권한이 [${newRole}](으)로 변경되었습니다.`);
  };

  const handleDeleteMember = (memberId: string) => {
    if (userRole !== 'admin') {
      onShowToast('팀원 삭제/내보내기는 프로젝트 관리자만 가능합니다.');
      return;
    }
    const target = teamMembers.find(m => m.id === memberId);
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    onShowToast(`'${target?.name || '팀원'}' 님이 프로젝트에서 제외되었습니다.`);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      onShowToast('이름과 이메일을 모두 입력해 주세요.');
      return;
    }
    const newMember: TeamMemberItem = {
      id: `mem-${Date.now()}`,
      name: inviteName.trim(),
      department: inviteDept,
      position: '연구원',
      email: inviteEmail.trim(),
      role: inviteRole,
      assignedSectionsCount: 0,
      joinedDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      status: '참여 중'
    };
    setTeamMembers(prev => [newMember, ...prev]);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    onShowToast(`'${newMember.name}' 님이 [${newMember.role}] 권한으로 프로젝트에 초대되었습니다.`);
  };

  // ==========================================
  // 2. 템플릿 및 스킬 관리 상태
  // ==========================================
  const [templates, setTemplates] = useState<TemplateItem[]>([
    {
      id: 'tpl-1',
      name: '2026 KPC 공공 수주 표준 템플릿 (Red Point)',
      category: '공공 표준',
      description: '공공기관 제안서 평가위원 심사표에 최적화된 3단 계층형 목차 및 기술/수행역량 중심 표준 서식',
      isDefault: true,
      updatedAt: '2026.09.12',
      sectionsCount: 14
    },
    {
      id: 'tpl-2',
      name: 'AI 플랫폼 & RAG 솔루션 기술제안서 특화 템플릿',
      category: '기술/AI',
      description: '클라우드 인프라, Microservices, RAG 벡터 파이프라인 및 ZDR 보안 아키텍처에 특화된 서식',
      isDefault: false,
      updatedAt: '2026.09.08',
      sectionsCount: 16
    },
    {
      id: 'tpl-3',
      name: '공공 빅데이터 구축 및 AI 컨설팅 제안 템플릿',
      category: '데이터/컨설팅',
      description: '품질보증, WBS 마일스톤, 투입인력 적격성 및 데이터 거버넌스 항목 중심 서식',
      isDefault: false,
      updatedAt: '2026.08.29',
      sectionsCount: 12
    }
  ]);

  const [skills, setSkills] = useState<SkillItem[]>([
    {
      id: 'skl-1',
      name: 'KPC 60년 노하우 정량 실적 인용 스킬',
      description: '한국생산성본부 280여 공공 수주 실적과 나이스 AAA 신용등급, 전담인력 통계를 정량 수치로 자동 인용',
      promptGuide: '공공기관의 신뢰도를 극대화할 수 있도록 KPC 누적 실적과 AAA 재무건전성을 첫 문단에 인용하라.',
      isDefault: true,
      category: '성과/실적',
      updatedAt: '2026.09.14'
    },
    {
      id: 'skl-2',
      name: '공공 보안 가이드라인(ZDR & 망분리) 준수 스킬',
      description: 'Zero Data Retention 규정과 사내망 DLP 마스킹을 강제하여 보안 부적격 감점을 원천 차단',
      promptGuide: '클라우드 보안인증(CSAP) 및 공공기관 망분리 환경 요건을 준수하도록 보안 대책을 기술하라.',
      isDefault: true,
      category: '보안/규정',
      updatedAt: '2026.09.13'
    },
    {
      id: 'skl-3',
      name: '평가위원 가독성 극대화 도식화 및 요약 스킬',
      description: '심사위원이 30초 내에 핵심을 파악할 수 있도록 주요 전략을 [배경 - 핵심 해결책 - 정량 효과] 3단으로 구성',
      promptGuide: '긴 서술형 문장을 지양하고 표와 불릿 포인트, 핵심 성과 지표(KPI)로 요약하라.',
      isDefault: false,
      category: '문체/격식',
      updatedAt: '2026.09.05'
    },
    {
      id: 'skl-4',
      name: 'RFP SFR 요구사항 정합성 자동 매핑 스킬',
      description: '발주처 제안요청서의 SFR(시스템기능요구사항) 코드번호를 본문에 명시하여 배점 누락 방지',
      promptGuide: '작성하는 내용이 어떤 SFR 항목을 충족하는지 대괄호 [SFR-00X] 형태로 명시하라.',
      isDefault: false,
      category: '검증/평가',
      updatedAt: '2026.09.02'
    }
  ]);

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('공공 표준');

  // Skill Modal
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillItem['category']>('성과/실적');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');

  const handleSetDefaultTemplate = (templateId: string) => {
    if (userRole !== 'admin') {
      onShowToast('기본 템플릿 지정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    setTemplates(prev => prev.map(t => ({
      ...t,
      isDefault: t.id === templateId
    })));
    const target = templates.find(t => t.id === templateId);
    onShowToast(`'${target?.name}'(이)가 프로젝트 기본 템플릿으로 지정되었습니다.`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (userRole !== 'admin') {
      onShowToast('템플릿 삭제는 프로젝트 관리자만 가능합니다.');
      return;
    }
    const target = templates.find(t => t.id === templateId);
    if (target?.isDefault) {
      onShowToast('기본 템플릿은 삭제할 수 없습니다. 다른 템플릿을 기본값으로 지정 후 삭제해 주세요.');
      return;
    }
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    onShowToast(`'${target?.name}' 템플릿이 삭제되었습니다.`);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      onShowToast('템플릿명을 입력해 주세요.');
      return;
    }
    const newTpl: TemplateItem = {
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      category: newTemplateCategory,
      description: newTemplateDesc.trim() || 'KPC 프로젝트 맞춤형 템플릿',
      isDefault: false,
      updatedAt: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      sectionsCount: 10
    };
    setTemplates(prev => [...prev, newTpl]);
    setIsTemplateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    onShowToast(`'${newTpl.name}' 템플릿이 등록되었습니다.`);
  };

  const handleToggleDefaultSkill = (skillId: string) => {
    if (userRole !== 'admin') {
      onShowToast('기본 AI 스킬 지정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    setSkills(prev => prev.map(s => s.id === skillId ? { ...s, isDefault: !s.isDefault } : s));
    const target = skills.find(s => s.id === skillId);
    const updatedStatus = !target?.isDefault;
    onShowToast(`'${target?.name}' 스킬이 기본값 ${updatedStatus ? '활성화' : '해제'}되었습니다.`);
  };

  const handleDeleteSkill = (skillId: string) => {
    if (userRole !== 'admin') {
      onShowToast('스킬 삭제는 프로젝트 관리자만 가능합니다.');
      return;
    }
    const target = skills.find(s => s.id === skillId);
    setSkills(prev => prev.filter(s => s.id !== skillId));
    onShowToast(`'${target?.name}' 스킬이 삭제되었습니다.`);
  };

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillPrompt.trim()) {
      onShowToast('스킬명과 프롬프트 지침을 입력해 주세요.');
      return;
    }
    const newSkl: SkillItem = {
      id: `skl-${Date.now()}`,
      name: newSkillName.trim(),
      description: newSkillDesc.trim() || 'KPC AI 전용 프롬프트 스킬',
      promptGuide: newSkillPrompt.trim(),
      isDefault: false,
      category: newSkillCategory,
      updatedAt: new Date().toISOString().slice(0, 10).replace(/-/g, '.')
    };
    setSkills(prev => [...prev, newSkl]);
    setIsSkillModalOpen(false);
    setNewSkillName('');
    setNewSkillDesc('');
    setNewSkillPrompt('');
    onShowToast(`'${newSkl.name}' 스킬이 성공적으로 등록되었습니다.`);
  };

  // ==========================================
  // 3. AI 생성 정책 상태 (Admin 설정 / User 열람)
  // ==========================================
  const [modelEngine, setModelEngine] = useState('Gemini 2.5 Pro (공공 수주 심층 추론 권장)');
  const [zdrPolicy, setZdrPolicy] = useState(true);
  const [ragStrictness, setRagStrictness] = useState<'strict' | 'standard' | 'flexible'>('strict');
  const [maxGenerationTokens, setMaxGenerationTokens] = useState('4,000 토큰 (약 8~10페이지 분량)');
  const [autoDlpMasking, setAutoDlpMasking] = useState(true);

  const handleSaveAiPolicy = () => {
    if (userRole !== 'admin') {
      onShowToast('AI 생성 정책 변경은 관리자만 가능합니다.');
      return;
    }
    onShowToast('프로젝트 AI 생성 정책 및 거버넌스 규칙이 저장되었습니다.');
  };

  // ==========================================
  // 4. 활동 및 변경 이력 상태 (Admin 전체 / User 본인 관련)
  // ==========================================
  const [activityLogs] = useState<ActivityLogItem[]>([
    {
      id: 'log-1',
      user: '정소담',
      userEmail: 'sodam.jeong@kpc.or.kr',
      action: '섹션 본문 작성',
      targetSection: '2.3 RAG 구축 방안',
      timestamp: '10분 전',
      details: '하이브리드 검색 파이프라인 및 HWP 한글 청킹 기법 기술 (1,850자 작성)',
      category: '작성',
      isCurrentUserRelated: true
    },
    {
      id: 'log-2',
      user: '정소담',
      userEmail: 'sodam.jeong@kpc.or.kr',
      action: 'AI 초안 생성',
      targetSection: '2.4 AI Agent 구축 방안',
      timestamp: '45분 전',
      details: 'Gemini 2.5 Pro 모델을 활용하여 노코드 Agent Builder 아키텍처 초안 도출 (3,200 토큰 소모)',
      category: 'AI생성',
      isCurrentUserRelated: true
    },
    {
      id: 'log-3',
      user: '김민수',
      userEmail: 'ms.kim@kpc.or.kr',
      action: '검토 피드백 등록',
      targetSection: '2.3 RAG 구축 방안 (정소담 담당)',
      timestamp: '1시간 전',
      details: '정소담 님의 2.3절에 [SFR-004] 검색 속도 0.5초 이내 보장 지표 추가 요청 코멘트 등록',
      category: '검토',
      isCurrentUserRelated: true
    },
    {
      id: 'log-4',
      user: '박지훈',
      userEmail: 'jh.park@kpc.or.kr',
      action: '섹션 본문 작성',
      targetSection: '2.1 플랫폼 전체 아키텍처',
      timestamp: '2시간 전',
      details: 'Enterprise AI Core 및 4계층 Service Mesh 아키텍처 설계 완료 (상태: 완료 변경)',
      category: '작성',
      isCurrentUserRelated: false
    },
    {
      id: 'log-5',
      user: '김민수 (PM)',
      userEmail: 'ms.kim@kpc.or.kr',
      action: '업무 담당자 배정',
      targetSection: '2.4 AI Agent 구축 방안',
      timestamp: '3시간 전',
      details: '작성자를 [정소담], 검토자를 [김민수]로 배정 완료',
      category: '권한배정',
      isCurrentUserRelated: true
    },
    {
      id: 'log-6',
      user: '이서연',
      userEmail: 'sy.lee@kpc.or.kr',
      action: '검토 승인',
      targetSection: '2.1 플랫폼 전체 아키텍처',
      timestamp: '4시간 전',
      details: '박지훈 님의 2.1 아키텍처 초안 검토 및 승인 처리 완료',
      category: '검토',
      isCurrentUserRelated: false
    },
    {
      id: 'log-7',
      user: '김민수 (PM)',
      userEmail: 'ms.kim@kpc.or.kr',
      action: 'RFP 문서 업로드 및 분석 시작',
      targetSection: '프로젝트 기본 설정',
      timestamp: '어제 16:30',
      details: 'KPC_AI플랫폼_RFP.pdf 업로드 및 AI 심층 분석 100% 완료',
      category: '문서업로드',
      isCurrentUserRelated: true
    },
    {
      id: 'log-8',
      user: '김민수 (PM)',
      userEmail: 'ms.kim@kpc.or.kr',
      action: 'AI 정책 설정',
      targetSection: 'AI 생성 정책',
      timestamp: '어제 17:15',
      details: 'ZDR 보안 모드 강제 및 Gemini 2.5 Pro 모델 지정',
      category: '설정변경',
      isCurrentUserRelated: false
    }
  ]);

  // Log filter for Admin
  const [logFilterUser, setLogFilterUser] = useState('전체');

  // Logs to display based on Role:
  // Admin: All logs (optionally filtered by dropdown)
  // User: STRICTLY only logs where isCurrentUserRelated === true (or user === '정소담')
  const visibleLogs = userRole === 'admin'
    ? activityLogs.filter(log => logFilterUser === '전체' || log.user.includes(logFilterUser))
    : activityLogs.filter(log => log.isCurrentUserRelated || log.user === currentUserName);

  // ==========================================
  // 5. 토큰 비용 및 AI 사용량 상태
  // (Admin: 전체/팀별 조회 + 한도 제한 설정 / User: 본인 + 팀 사용량만 조회)
  // ==========================================
  const totalTeamTokens = 485200;
  const totalTeamCost = 72780; // KRW
  const myPersonalTokens = 142500;
  const myPersonalCost = 21375; // KRW

  // Admin Quota & Budget Controls
  const [tokenBudgetCap, setTokenBudgetCap] = useState('2,000,000');
  const [costBudgetCap, setCostBudgetCap] = useState('300,000');
  const [alertThresholdPercent, setAlertThresholdPercent] = useState('80');
  const [blockOnOverbudget, setBlockOnOverbudget] = useState(true);

  const handleSaveBudgetLimit = () => {
    if (userRole !== 'admin') {
      onShowToast('토큰 및 예산 한도 설정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    onShowToast(`토큰 한도(${tokenBudgetCap} 토큰) 및 예산 제한(₩${costBudgetCap}) 설정이 안전하게 저장되었습니다.`);
  };

  // ==========================================
  // 6. 프로젝트 알림 설정 상태 (User & Admin 개인 설정)
  // ==========================================
  const [notifyDday, setNotifyDday] = useState(true);
  const [notifyMySectionComment, setNotifyMySectionComment] = useState(true);
  const [notifyReviewRequest, setNotifyReviewRequest] = useState(true);
  const [notifyReviewCompleted, setNotifyReviewCompleted] = useState(true);
  const [receiveEmailAlert, setReceiveEmailAlert] = useState(true);
  const [receiveSlackAlert, setReceiveSlackAlert] = useState(true);
  const [alertSound, setAlertSound] = useState(false);

  // Admin Project Shared Slack Channel
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('https://hooks.slack.com/services/KPC/B079/PROPOSALS');

  const handleSaveNotificationSettings = () => {
    onShowToast('프로젝트 알림 수신 설정이 성공적으로 저장되었습니다.');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8F9FA] p-6 pb-24">
      <div className="max-w-6xl mx-auto w-full space-y-6">

        {/* 1. Project Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs text-neutral-500 font-semibold">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-neutral-400" />
                {activeProject?.agency || '한국생산성본부'}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="flex items-center gap-1">
                제출 마감: {activeProject?.deadline || '2026.11.30'}
              </span>
              <span className="text-neutral-300">|</span>
              <span>PM: {activeProject?.manager || '김민수'}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-[#E60012] flex items-center justify-center font-black text-sm shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                  <span>[프로젝트 관리]</span>
                  <span>{activeProject?.title || '2026 KPC AI 플랫폼 구축 사업'}</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Role Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {userRole === 'admin' ? (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-[#E60012] border border-red-200 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#E60012]" />
                <span>프로젝트 관리자 (Admin)</span>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                <User className="w-4 h-4 text-blue-600" />
                <span>일반 팀원 ({currentUserName} · {currentUserRoleName})</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Top Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-neutral-200 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-white text-[#E60012] border-t-2 border-l border-r border-[#E60012] border-t-[#E60012] shadow-2xs -mb-px'
                : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>팀원 및 권한 관리</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'members' ? 'bg-red-50 text-[#E60012]' : 'bg-neutral-200 text-neutral-600'
            }`}>
              {teamMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('templates_skills')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'templates_skills'
                ? 'bg-white text-[#E60012] border-t-2 border-l border-r border-[#E60012] border-t-[#E60012] shadow-2xs -mb-px'
                : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>템플릿 및 스킬 관리</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'templates_skills' ? 'bg-red-50 text-[#E60012]' : 'bg-neutral-200 text-neutral-600'
            }`}>
              {templates.length + skills.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai_policy')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai_policy'
                ? 'bg-white text-[#E60012] border-t-2 border-l border-r border-[#E60012] border-t-[#E60012] shadow-2xs -mb-px'
                : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI 생성 정책</span>
            {userRole !== 'admin' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500 font-normal">열람</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('activity_logs')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'activity_logs'
                ? 'bg-white text-[#E60012] border-t-2 border-l border-r border-[#E60012] border-t-[#E60012] shadow-2xs -mb-px'
                : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70'
            }`}
          >
            <History className="w-4 h-4" />
            <span>활동 및 변경 이력</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'activity_logs' ? 'bg-red-50 text-[#E60012]' : 'bg-neutral-200 text-neutral-600'
            }`}>
              {visibleLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cost_usage')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cost_usage'
                ? 'bg-white text-[#E60012] border-t-2 border-l border-r border-[#E60012] border-t-[#E60012] shadow-2xs -mb-px'
                : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>토큰 비용 및 AI 사용량</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-white text-[#E60012] border-t-2 border-l border-r border-[#E60012] border-t-[#E60012] shadow-2xs -mb-px'
                : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-100/70'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>프로젝트 알림 설정</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 팀원 및 권한 관리 (Users & Permissions) */}
        {/* ========================================================================= */}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Permission Banner for Admin: Project Invitation Toggle */}
            {userRole === 'admin' ? (
              <div className="bg-white rounded-2xl border-2 border-neutral-200 p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isTeamInvited ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[#111111]">
                        팀원 프로젝트 접근 권한 및 초대 관리
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        isTeamInvited
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isTeamInvited ? '✅ 팀원 초대 완료 (접근 허용 중)' : '⚠️ 팀원 미초대 (일반 팀원 제안서 접근 제한 상태)'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-2xl">
                      관리자가 RFP 파일 업로드 및 분석을 완료한 후 팀원을 초대하면 일반 팀원들이 제안서 작성에 접근할 수 있습니다.
                      팀원 초대를 완료하면 모든 팀원에게 작성 및 협업 권한이 부여됩니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={handleToggleTeamInvited}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isTeamInvited
                        ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                        : 'bg-[#E60012] hover:bg-[#CC0010] text-white shadow-sm'
                    }`}
                  >
                    {isTeamInvited ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>팀원 접근 권한 일시 회수</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        <span>👥 팀원 전체 초대 및 접근 권한 활성화</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs font-black shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#E60012]" />
                    <span>새 팀원 초대</span>
                  </button>
                </div>
              </div>
            ) : (
              /* User Role View: My Permissions Summary Highlight Card */
              <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#111111]">
                        내 프로젝트 역할 및 권한 범위 (My Role)
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {currentUserName} (AI사업본부 · 선임연구원) 님에게 부여된 제안 권한입니다.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                    부여된 역할: {currentUserRoleName}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-1.5">
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 이용 가능한 작업 (Allowed)
                    </span>
                    <ul className="space-y-1 text-neutral-600 pl-4 list-disc text-[11px]">
                      <li>담당 섹션(2.3 RAG 구축 방안, 2.4 AI Agent 방안 등) 본문 작성 및 저장</li>
                      <li>AI 지원 초안 생성 및 프롬프트 인용</li>
                      <li>검토자에게 검토 요청 및 코멘트/피드백 작성</li>
                      <li>본인 활동 및 변경 이력 조회</li>
                      <li>개인 맞춤 알림 설정 및 본인/팀 토큰 사용량 확인</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-1.5">
                    <span className="font-bold text-neutral-600 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-neutral-400" /> 관리자 전용 제한 항목 (Restricted)
                    </span>
                    <ul className="space-y-1 text-neutral-500 pl-4 list-disc text-[11px]">
                      <li>제안서 목차(섹션별) 업무 담당자 배정 드롭다운 (관리자 전용)</li>
                      <li>프로젝트명, 제안서 작성 방식 및 RFP 원본 수정/삭제 (관리자 전용)</li>
                      <li>팀원 권한 변경, 추가 및 초대 (관리자 전용)</li>
                      <li>템플릿/스킬 등록, 수정, 삭제, 기본값 지정 (관리자 전용)</li>
                      <li>AI 생성 정책 및 토큰 사용량/비용 제한 설정 (관리자 전용)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members List Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#111111]">
                    프로젝트 참여 팀원 목록
                  </h3>
                  <span className="text-xs text-neutral-500 font-semibold">
                    (총 {teamMembers.length}명)
                  </span>
                </div>

                <div className="text-xs text-neutral-500 flex items-center gap-2">
                  {userRole === 'admin' ? (
                    <span className="text-neutral-500">
                      * 역할을 변경하거나 권한을 재지정할 수 있습니다.
                    </span>
                  ) : (
                    <span className="text-neutral-500">
                      * 일반 팀원은 팀원 목록을 열람할 수 있습니다.
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-700">
                  <thead className="bg-neutral-100 text-neutral-700 text-[11px] font-bold uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="py-3 px-4">팀원 이름 / 본부</th>
                      <th className="py-3 px-3">이메일</th>
                      <th className="py-3 px-3 w-36 text-center">역할 (Role)</th>
                      <th className="py-3 px-3 text-center">담당 섹션 수</th>
                      <th className="py-3 px-3 text-center">참여일</th>
                      <th className="py-3 px-3 text-center">상태</th>
                      {userRole === 'admin' && (
                        <th className="py-3 px-4 w-28 text-center">관리</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {teamMembers.map(member => {
                      const isMe = member.name === currentUserName;
                      return (
                        <tr key={member.id} className={`hover:bg-neutral-50/80 transition-colors ${
                          isMe ? 'bg-blue-50/30' : ''
                        }`}>
                          <td className="py-3.5 px-4 font-bold text-[#111111]">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                member.role === 'PM'
                                  ? 'bg-purple-100 text-purple-700'
                                  : isMe
                                  ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}>
                                {member.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                  {isMe && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                      나 (본인)
                                    </span>
                                  )}
                                  <span className="text-[11px] text-neutral-400 font-normal">
                                    {member.position}
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-500 font-normal">
                                  {member.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-neutral-600 font-mono text-[11px]">
                            {member.email}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {userRole === 'admin' ? (
                              <select
                                value={member.role}
                                onChange={e => handleUpdateMemberRole(member.id, e.target.value as TeamMemberItem['role'])}
                                className="px-2.5 py-1 rounded-lg border border-neutral-300 font-bold text-xs text-[#111111] bg-white cursor-pointer hover:border-[#E60012] focus:outline-none focus:ring-1 focus:ring-[#E60012]"
                              >
                                <option value="PM">PM (총괄 관리)</option>
                                <option value="선임 작성자">선임 작성자</option>
                                <option value="작성자">작성자</option>
                                <option value="검토자">검토자</option>
                                <option value="뷰어">뷰어</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                member.role === 'PM'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : member.role === '선임 작성자'
                                  ? 'bg-red-50 text-[#E60012] border-red-200'
                                  : member.role === '검토자'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                              }`}>
                                {member.role}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center font-semibold text-neutral-800">
                            {member.assignedSectionsCount > 0 ? `${member.assignedSectionsCount}개 섹션` : '-'}
                          </td>

                          <td className="py-3.5 px-3 text-center text-neutral-500 font-mono text-[11px]">
                            {member.joinedDate}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              member.status === '참여 중'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                member.status === '참여 중' ? 'bg-emerald-600' : 'bg-neutral-400'
                              }`} />
                              <span>{member.status}</span>
                            </span>
                          </td>

                          {userRole === 'admin' && (
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                disabled={member.role === 'PM'}
                                className={`p-1.5 rounded transition-colors ${
                                  member.role === 'PM'
                                    ? 'text-neutral-300 cursor-not-allowed'
                                    : 'text-neutral-400 hover:text-[#E60012] hover:bg-red-50 cursor-pointer'
                                }`}
                                title={member.role === 'PM' ? 'PM은 제외할 수 없습니다' : '팀원 제외'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invite Modal for Admin */}
            {isInviteModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-[#111111]">새 팀원 초대</h3>
                    </div>
                    <button
                      onClick={() => setIsInviteModalOpen(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAddMember} className="p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        팀원 이름 <span className="text-[#E60012]">*</span>
                      </label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder="예: 홍길동"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        소속 본부
                      </label>
                      <select
                        value={inviteDept}
                        onChange={e => setInviteDept(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] bg-white"
                      >
                        <option value="AI산업본부">AI산업본부</option>
                        <option value="AI사업본부">AI사업본부</option>
                        <option value="컨설팅본부">컨설팅본부</option>
                        <option value="교육사업본부">교육사업본부</option>
                        <option value="생산성본부">생산성본부</option>
                        <option value="CX본부">CX본부</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        사내 이메일 <span className="text-[#E60012]">*</span>
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="예: gd.hong@kpc.or.kr"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        부여할 역할 (Role)
                      </label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] bg-white font-bold"
                      >
                        <option value="작성자">작성자 (할당된 섹션 본문 집필)</option>
                        <option value="선임 작성자">선임 작성자 (주요 절 총괄 집필)</option>
                        <option value="검토자">검토자 (리뷰 및 승인 권한)</option>
                        <option value="PM">PM (총괄 관리)</option>
                        <option value="뷰어">뷰어 (열람 전용)</option>
                      </select>
                    </div>

                    <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs"
                      >
                        초대 발송
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 템플릿 및 스킬 관리 (Templates & Skills) */}
        {/* ========================================================================= */}
        {activeTab === 'templates_skills' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Sub-tab switcher */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemplateSkillSubTab('templates')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    templateSkillSubTab === 'templates'
                      ? 'bg-[#111111] text-white shadow-2xs'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  제안서 템플릿 관리 ({templates.length})
                </button>
                <button
                  onClick={() => setTemplateSkillSubTab('skills')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    templateSkillSubTab === 'skills'
                      ? 'bg-[#E60012] text-white shadow-2xs'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  AI 프롬프트/스킬 관리 ({skills.length})
                </button>
              </div>

              {/* Admin Action Buttons */}
              {userRole === 'admin' ? (
                <div>
                  {templateSkillSubTab === 'templates' ? (
                    <button
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 템플릿 등록</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSkillModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 AI 스킬 등록</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-neutral-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>템플릿/스킬 등록, 수정, 삭제 및 기본값 지정은 관리자 전용입니다.</span>
                </div>
              )}
            </div>

            {/* Sub-View A: Templates */}
            {templateSkillSubTab === 'templates' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                      tpl.isDefault
                        ? 'border-[#E60012] ring-1 ring-[#E60012]/20 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                          {tpl.category}
                        </span>
                        {tpl.isDefault ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-[#E60012] border border-red-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> 기본 템플릿 (Default)
                          </span>
                        ) : userRole === 'admin' ? (
                          <button
                            onClick={() => handleSetDefaultTemplate(tpl.id)}
                            className="text-[10px] font-bold text-neutral-500 hover:text-[#E60012] hover:underline cursor-pointer"
                          >
                            기본값 지정
                          </button>
                        ) : null}
                      </div>

                      <h4 className="text-sm font-black text-[#111111] leading-snug">
                        {tpl.name}
                      </h4>

                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {tpl.description}
                      </p>

                      <div className="pt-2 flex items-center gap-3 text-[11px] text-neutral-400">
                        <span>목차: {tpl.sectionsCount}개 장/절</span>
                        <span>•</span>
                        <span>최종 수정: {tpl.updatedAt}</span>
                      </div>
                    </div>

                    {userRole === 'admin' && (
                      <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
                        <button
                          onClick={() => handleSetDefaultTemplate(tpl.id)}
                          disabled={tpl.isDefault}
                          className={`text-xs font-bold transition-colors ${
                            tpl.isDefault
                              ? 'text-[#E60012] font-black cursor-default'
                              : 'text-neutral-600 hover:text-[#E60012] cursor-pointer'
                          }`}
                        >
                          {tpl.isDefault ? '기본값 적용 중' : '기본값으로 지정'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            disabled={tpl.isDefault}
                            className={`p-1 rounded transition-colors ${
                              tpl.isDefault
                                ? 'text-neutral-300 cursor-not-allowed'
                                : 'text-neutral-400 hover:text-[#E60012] hover:bg-red-50 cursor-pointer'
                            }`}
                            title={tpl.isDefault ? '기본 템플릿은 삭제할 수 없습니다' : '삭제'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sub-View B: Skills */}
            {templateSkillSubTab === 'skills' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map(skill => (
                  <div
                    key={skill.id}
                    className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      skill.isDefault
                        ? 'border-[#E60012] ring-1 ring-[#E60012]/20 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {skill.category}
                          </span>
                          <span className="text-xs font-black text-[#111111]">
                            {skill.name}
                          </span>
                        </div>

                        {skill.isDefault ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-[#E60012] border border-red-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> 기본 스킬
                          </span>
                        ) : userRole === 'admin' ? (
                          <button
                            onClick={() => handleToggleDefaultSkill(skill.id)}
                            className="text-[10px] font-bold text-neutral-500 hover:text-[#E60012] cursor-pointer"
                          >
                            기본값 활성화
                          </button>
                        ) : null}
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {skill.description}
                      </p>

                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                        <span className="text-[10px] font-bold text-neutral-400 block mb-1">
                          프롬프트 지침 가이드라인:
                        </span>
                        <p className="text-neutral-700 font-mono text-[11px] leading-relaxed">
                          &quot;{skill.promptGuide}&quot;
                        </p>
                      </div>
                    </div>

                    {userRole === 'admin' && (
                      <div className="pt-3 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleToggleDefaultSkill(skill.id)}
                          className="font-bold text-neutral-700 hover:text-[#E60012] cursor-pointer"
                        >
                          {skill.isDefault ? '기본값 해제' : '기본값으로 지정'}
                        </button>

                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-1 text-neutral-400 hover:text-[#E60012] hover:bg-red-50 rounded cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Template Registration Modal */}
            {isTemplateModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-[#111111]">새 제안서 템플릿 등록</h3>
                    </div>
                    <button
                      onClick={() => setIsTemplateModalOpen(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTemplate} className="p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        템플릿명 <span className="text-[#E60012]">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={e => setNewTemplateName(e.target.value)}
                        placeholder="예: 2026 공공 데이터 플랫폼 제안서 템플릿"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        카테고리 구분
                      </label>
                      <select
                        value={newTemplateCategory}
                        onChange={e => setNewTemplateCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] bg-white"
                      >
                        <option value="공공 표준">공공 표준</option>
                        <option value="기술/AI">기술/AI</option>
                        <option value="데이터/컨설팅">데이터/컨설팅</option>
                        <option value="교육/역량강화">교육/역량강화</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        템플릿 설명
                      </label>
                      <textarea
                        rows={3}
                        value={newTemplateDesc}
                        onChange={e => setNewTemplateDesc(e.target.value)}
                        placeholder="템플릿의 주요 특징 및 대상 사업군을 입력하세요."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsTemplateModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs"
                      >
                        등록하기
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Skill Registration Modal */}
            {isSkillModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-[#111111]">새 AI 스킬 등록</h3>
                    </div>
                    <button
                      onClick={() => setIsSkillModalOpen(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateSkill} className="p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        스킬명 <span className="text-[#E60012]">*</span>
                      </label>
                      <input
                        type="text"
                        value={newSkillName}
                        onChange={e => setNewSkillName(e.target.value)}
                        placeholder="예: 공공기관 품질보증체계 정량 제시 스킬"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        카테고리
                      </label>
                      <select
                        value={newSkillCategory}
                        onChange={e => setNewSkillCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] bg-white"
                      >
                        <option value="성과/실적">성과/실적 (실적 증명 및 수치 인용)</option>
                        <option value="보안/규정">보안/규정 (ZDR 및 컴플라이언스)</option>
                        <option value="문체/격식">문체/격식 (가독성 및 공문서체)</option>
                        <option value="검증/평가">검증/평가 (SFR 매핑 및 심사기준)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        설명
                      </label>
                      <input
                        type="text"
                        value={newSkillDesc}
                        onChange={e => setNewSkillDesc(e.target.value)}
                        placeholder="스킬의 용도와 기대효과를 입력하세요."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        프롬프트 지침 (Prompt Instruction) <span className="text-[#E60012]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={newSkillPrompt}
                        onChange={e => setNewSkillPrompt(e.target.value)}
                        placeholder="AI가 본문을 작성하거나 요약할 때 반드시 준수해야 할 프롬프트 규칙을 명시하세요."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                      />
                    </div>

                    <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSkillModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs"
                      >
                        등록하기
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AI 생성 정책 (AI Generation Policy) */}
        {/* ========================================================================= */}
        {activeTab === 'ai_policy' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {userRole !== 'admin' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-800">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  본 프로젝트의 AI 생성 규칙은 프로젝트 관리자가 지정한 전사 거버넌스 정책에 따라 엄격히 보호되고 있습니다. (일반 팀원은 조회만 가능)
                </span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                  <h3 className="text-base font-black text-[#111111]">
                    프로젝트 AI 추론 모델 및 보안 정책 설정
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    제안서 생성 시 사용되는 LLM 엔진, 보안 무보존 규정, 사실성(Factuality) 검증 기준을 정의합니다.
                  </p>
                </div>
                {userRole === 'admin' && (
                  <button
                    onClick={handleSaveAiPolicy}
                    className="px-5 py-2 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>정책 저장하기</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* 1. Model Engine */}
                <div className="space-y-2">
                  <label className="block font-bold text-neutral-800">
                    기본 AI 추론 모델 (Default Model)
                  </label>
                  {userRole === 'admin' ? (
                    <select
                      value={modelEngine}
                      onChange={e => setModelEngine(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-[#111111] bg-white focus:border-[#E60012] focus:outline-none"
                    >
                      <option value="Gemini 2.5 Pro (공공 수주 심층 추론 권장)">Gemini 2.5 Pro (공공 수주 심층 추론 권장)</option>
                      <option value="Claude 3.7 Sonnet (기술 아키텍처 특화)">Claude 3.7 Sonnet (기술 아키텍처 특화)</option>
                      <option value="GPT-4o (문장 다듬기 및 번역)">GPT-4o (문장 다듬기 및 번역)</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 font-bold text-[#111111]">
                      {modelEngine}
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    KPC 맞춤형 공공 수주 제안서 작성 시 가장 높은 평가점수를 도출하는 공인 모델입니다.
                  </p>
                </div>

                {/* 2. Factuality / Hallucination check */}
                <div className="space-y-2">
                  <label className="block font-bold text-neutral-800">
                    사실성(Factuality) 및 환각 검증 엄격도
                  </label>
                  {userRole === 'admin' ? (
                    <select
                      value={ragStrictness}
                      onChange={e => setRagStrictness(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-[#111111] bg-white focus:border-[#E60012] focus:outline-none"
                    >
                      <option value="strict">엄격 (KPC 검증 실적 및 업로드된 RFP 원문만 100% 인용)</option>
                      <option value="standard">표준 (KPC 실적 우선 + 일반적인 IT 표준 규격 허용)</option>
                      <option value="flexible">유연 (아이디어 도출 및 자유 창작 허용)</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 font-bold text-[#111111]">
                      {ragStrictness === 'strict' ? '엄격 (KPC 검증 실적 및 업로드된 RFP 원문만 100% 인용)' : '표준'}
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    공공기관 입찰의 경우 허위 실적 인용 시 입찰 무효 사유가 되므로 &apos;엄격&apos; 설정을 권장합니다.
                  </p>
                </div>

                {/* 3. Max Tokens */}
                <div className="space-y-2">
                  <label className="block font-bold text-neutral-800">
                    1회 최대 생성 토큰 (Max Output Limit)
                  </label>
                  {userRole === 'admin' ? (
                    <select
                      value={maxGenerationTokens}
                      onChange={e => setMaxGenerationTokens(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-[#111111] bg-white focus:border-[#E60012] focus:outline-none"
                    >
                      <option value="2,000 토큰 (약 4~5페이지 분량)">2,000 토큰 (약 4~5페이지 분량)</option>
                      <option value="4,000 토큰 (약 8~10페이지 분량)">4,000 토큰 (약 8~10페이지 분량) [권장]</option>
                      <option value="8,000 토큰 (약 15페이지 이상 대형 절)">8,000 토큰 (약 15페이지 이상 대형 절)</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 font-bold text-[#111111]">
                      {maxGenerationTokens}
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    단일 섹션 집필 시 AI가 초안으로 작성할 수 있는 최대 글자 수를 제어합니다.
                  </p>
                </div>

                {/* 4. Security: ZDR & DLP */}
                <div className="space-y-3">
                  <label className="block font-bold text-neutral-800">
                    보안 및 데이터 보호 거버넌스 (Compliance)
                  </label>

                  <div className="space-y-2">
                    <label className={`flex items-center justify-between p-3 rounded-xl border ${
                      zdrPolicy ? 'bg-red-50/20 border-red-200' : 'bg-neutral-50 border-neutral-200'
                    } ${userRole === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#E60012]" />
                        <div>
                          <span className="font-bold text-[#111111] block">Zero Data Retention (ZDR) 강제</span>
                          <span className="text-[10px] text-neutral-500">AI 모델 학습에 제안서 원문 일체 미보존</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={zdrPolicy}
                        disabled={userRole !== 'admin'}
                        onChange={e => setZdrPolicy(e.target.checked)}
                        className="accent-[#E60012] w-4 h-4"
                      />
                    </label>

                    <label className={`flex items-center justify-between p-3 rounded-xl border ${
                      autoDlpMasking ? 'bg-red-50/20 border-red-200' : 'bg-neutral-50 border-neutral-200'
                    } ${userRole === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#E60012]" />
                        <div>
                          <span className="font-bold text-[#111111] block">개인정보(PII) & 기밀 실적 자동 마스킹</span>
                          <span className="text-[10px] text-neutral-500">주민번호, 개인 전화번호, 비공개 금액 암호화</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoDlpMasking}
                        disabled={userRole !== 'admin'}
                        onChange={e => setAutoDlpMasking(e.target.checked)}
                        className="accent-[#E60012] w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 활동 및 변경 이력 (Activity & Audit History) */}
        {/* ========================================================================= */}
        {activeTab === 'activity_logs' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header / Filter Bar */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#111111] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#E60012]" />
                  <span>프로젝트 활동 및 변경 이력 조회</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {userRole === 'admin' ? (
                    '관리자 권한: 프로젝트 내 모든 팀원의 본문 작성, AI 생성, 검토 승인, 설정 변경 이력을 전체 조회합니다.'
                  ) : (
                    '일반 팀원 권한: 본인(정소담) 및 본인에게 할당되거나 관련된 작업 이력만 안전하게 조회됩니다.'
                  )}
                </p>
              </div>

              {userRole === 'admin' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-semibold">작업자 필터:</span>
                  <select
                    value={logFilterUser}
                    onChange={e => setLogFilterUser(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-[#111111] bg-white focus:outline-none"
                  >
                    <option value="전체">전체 팀원 이력 ({activityLogs.length}건)</option>
                    <option value="정소담">정소담 님 이력</option>
                    <option value="김민수">김민수 님 이력</option>
                    <option value="박지훈">박지훈 님 이력</option>
                    <option value="이서연">이서연 님 이력</option>
                  </select>
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>내 관련 작업: 총 {visibleLogs.length}건</span>
                </div>
              )}
            </div>

            {/* Logs Timeline Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="divide-y divide-neutral-200">
                {visibleLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-neutral-50/70 transition-colors flex items-start justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        log.category === '작성'
                          ? 'bg-blue-50 text-blue-700'
                          : log.category === 'AI생성'
                          ? 'bg-purple-50 text-purple-700'
                          : log.category === '검토'
                          ? 'bg-amber-50 text-amber-700'
                          : log.category === '권한배정'
                          ? 'bg-red-50 text-[#E60012]'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {log.category === 'AI생성' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : log.category === '검토' ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#111111]">{log.user}</span>
                          <span className="text-[11px] text-neutral-400 font-mono">({log.userEmail})</span>
                          <span className="text-neutral-300">•</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.category === 'AI생성' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            log.category === '검토' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {log.action}
                          </span>
                        </div>

                        <p className="text-neutral-700 font-medium leading-relaxed">
                          {log.details}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <span className="font-semibold text-neutral-600">대상: {log.targetSection}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-[11px] text-neutral-400 font-mono">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {visibleLogs.length === 0 && (
                  <div className="p-12 text-center text-neutral-400 text-xs">
                    표시할 활동 이력이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: 토큰 비용 및 AI 사용량 (Cost & AI Usage) */}
        {/* ========================================================================= */}
        {activeTab === 'cost_usage' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Cards: Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: My Personal Usage */}
              <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-[#111111]">
                      내 토큰 소모량 ({currentUserName})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    전체 팀의 29.4%
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#111111]">
                    {myPersonalTokens.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">토큰</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-sm font-bold text-blue-700">
                    ₩{myPersonalCost.toLocaleString()}
                  </span>
                </div>

                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '29.4%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>작성 섹션: 3개</span>
                  <span>AI 초안 생성: 12회</span>
                </div>
              </div>

              {/* Card 2: Team Total Usage */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-[#111111]">
                      프로젝트 전체 팀 누적 사용량
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#E60012] border border-red-200">
                    예산 한도 내 정상 가동 중
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#111111]">
                    {totalTeamTokens.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">토큰</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-sm font-bold text-[#E60012]">
                    ₩{totalTeamCost.toLocaleString()}
                  </span>
                </div>

                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#E60012] h-2 rounded-full" style={{ width: '24.3%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>설정 한도: 2,000,000 토큰</span>
                  <span>소진율: 24.3%</span>
                </div>
              </div>
            </div>

            {/* Team Breakdown Chart / Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-[#111111]">
                팀원별 AI 토큰 소모 내역 비교
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#111111]">김민수 (PM) - 198,300 토큰 (₩29,745)</span>
                    <span className="text-neutral-500">40.9%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '40.9%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#111111]">정소담 (나) - 142,500 토큰 (₩21,375)</span>
                    <span className="text-neutral-500 font-bold text-blue-600">29.4%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '29.4%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#111111]">박지훈 - 144,400 토큰 (₩21,660)</span>
                    <span className="text-neutral-500">29.7%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div className="bg-neutral-600 h-2 rounded-full" style={{ width: '29.7%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Quota / Budget Restriction Panel */}
            {userRole === 'admin' ? (
              <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div>
                    <h3 className="text-sm font-black text-[#111111] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#E60012]" />
                      <span>토큰 비용 및 AI 사용량 제한 (Budget Quota Cap) 설정</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      프로젝트별 최대 허용 토큰 및 예산 한도를 지정하여 과다 과금을 차단합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveBudgetLimit}
                    className="px-4 py-2 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>사용량 제한 저장</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      프로젝트 최대 토큰 한도 (Token Limit)
                    </label>
                    <input
                      type="text"
                      value={tokenBudgetCap}
                      onChange={e => setTokenBudgetCap(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">권장: 공공 제안 기준 2,000,000 ~ 5,000,000 토큰</span>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      최대 예산 한도 (Budget Cap - KRW)
                    </label>
                    <input
                      type="text"
                      value={costBudgetCap}
                      onChange={e => setCostBudgetCap(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">한화 기준 (예: 300,000원)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      임계치 도달 경고 알림 (Threshold %)
                    </label>
                    <select
                      value={alertThresholdPercent}
                      onChange={e => setAlertThresholdPercent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-[#111111] bg-white focus:outline-none"
                    >
                      <option value="70">70% 도달 시 관리자 알림</option>
                      <option value="80">80% 도달 시 관리자 알림 (권장)</option>
                      <option value="90">90% 도달 시 관리자 알림</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 self-end">
                    <div>
                      <span className="font-bold text-[#111111] block">100% 예산 초과 시 AI 생성 차단</span>
                      <span className="text-[10px] text-neutral-500">한도 도달 시 팀원 추가 생성 일시 정지</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={blockOnOverbudget}
                      onChange={e => setBlockOnOverbudget(e.target.checked)}
                      className="accent-[#E60012] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-neutral-100 rounded-xl text-center text-xs text-neutral-500 border border-neutral-200">
                ※ 프로젝트 토큰 비용 한도 및 사용량 제한 설정은 프로젝트 관리자(Admin) 권한으로만 구성할 수 있습니다.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: 프로젝트 알림 설정 (Project Notifications) */}
        {/* ========================================================================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                  <h3 className="text-base font-black text-[#111111]">
                    프로젝트 알림 수신 및 리마인더 설정
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    제안서 마감 D-Day, 본인 담당 섹션 코멘트, 검토 요청 및 승인 피드백 알림 방식을 설정합니다.
                  </p>
                </div>
                <button
                  onClick={handleSaveNotificationSettings}
                  className="px-5 py-2 rounded-xl bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>알림 설정 저장</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: D-Day */}
                  <label className="flex items-start justify-between p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50/60 cursor-pointer transition-colors">
                    <div>
                      <span className="font-bold text-[#111111] block mb-0.5">
                        제안서 제출 마감 D-Day 알림
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        마감 7일 전, 3일 전, 1일 전에 긴급 리마인더 푸시를 발송합니다.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyDday}
                      onChange={e => setNotifyDday(e.target.checked)}
                      className="accent-[#E60012] w-4 h-4 cursor-pointer mt-0.5"
                    />
                  </label>

                  {/* Option 2: Comments on My Section */}
                  <label className="flex items-start justify-between p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50/60 cursor-pointer transition-colors">
                    <div>
                      <span className="font-bold text-[#111111] block mb-0.5">
                        내 담당 섹션 코멘트 & 피드백 알림
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        동료 팀원이나 PM이 내가 집필한 섹션에 피드백을 남기면 즉시 알립니다.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyMySectionComment}
                      onChange={e => setNotifyMySectionComment(e.target.checked)}
                      className="accent-[#E60012] w-4 h-4 cursor-pointer mt-0.5"
                    />
                  </label>

                  {/* Option 3: Comment Notification */}
                  <label className="flex items-start justify-between p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50/60 cursor-pointer transition-colors">
                    <div>
                      <span className="font-bold text-[#111111] block mb-0.5">
                        댓글 및 멘션 (Comment & Mention) 알림
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        본인이 작성 중인 목차나 본인을 @멘션한 댓글이 등록되면 실시간으로 알립니다.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyReviewRequest}
                      onChange={e => setNotifyReviewRequest(e.target.checked)}
                      className="accent-[#E60012] w-4 h-4 cursor-pointer mt-0.5"
                    />
                  </label>

                  {/* Option 4: Review Approved */}
                  <label className="flex items-start justify-between p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50/60 cursor-pointer transition-colors">
                    <div>
                      <span className="font-bold text-[#111111] block mb-0.5">
                        검토 완료 및 최종 승인 알림
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        내 담당 섹션의 검토가 승인 완료되면 알립니다.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyReviewCompleted}
                      onChange={e => setNotifyReviewCompleted(e.target.checked)}
                      className="accent-[#E60012] w-4 h-4 cursor-pointer mt-0.5"
                    />
                  </label>
                </div>

                {/* Channel Preferences */}
                <div className="pt-4 border-t border-neutral-100 space-y-3">
                  <h4 className="font-bold text-neutral-800">
                    알림 수신 채널 선택
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                      <span className="font-semibold text-neutral-800">사내 이메일 수신</span>
                      <input
                        type="checkbox"
                        checked={receiveEmailAlert}
                        onChange={e => setReceiveEmailAlert(e.target.checked)}
                        className="accent-[#E60012] w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                      <span className="font-semibold text-neutral-800">슬랙(Slack) DM 수신</span>
                      <input
                        type="checkbox"
                        checked={receiveSlackAlert}
                        onChange={e => setReceiveSlackAlert(e.target.checked)}
                        className="accent-[#E60012] w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer">
                      <span className="font-semibold text-neutral-800">브라우저 알림음 효과</span>
                      <input
                        type="checkbox"
                        checked={alertSound}
                        onChange={e => setAlertSound(e.target.checked)}
                        className="accent-[#E60012] w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Admin Project Slack Webhook Integration */}
                {userRole === 'admin' && (
                  <div className="pt-4 border-t border-neutral-100 space-y-2">
                    <label className="block font-bold text-neutral-800">
                      프로젝트 공용 슬랙 채널 Webhook 연동 (Admin)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={slackWebhookUrl}
                        onChange={e => setSlackWebhookUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] font-mono focus:outline-none focus:border-[#E60012]"
                      />
                      <button
                        onClick={() => onShowToast('슬랙 웹훅 테스트 메시지가 채널로 전송되었습니다.')}
                        className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold cursor-pointer shrink-0"
                      >
                        테스트 발송
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
