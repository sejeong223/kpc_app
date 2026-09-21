"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { PermissionTable, PermissionUser } from "@/components/admin/PermissionTable";
import { PermissionFilter } from "@/components/admin/PermissionFilter";
import { Pagination } from "@/components/ui/pagination";
import { Plus } from "lucide-react";
import { toast } from "sonner";

// Mock Data
const MOCK_USERS_LIST: PermissionUser[] = [
  { id: 1, name: "박지성", email: "park@example.com", role: "admin", type: "user" },
  { id: 2, name: "손흥민", email: "son@example.com", role: "user", type: "user" },
  { id: 3, name: "Sales Team", email: "sales@daruda.io", role: "user", type: "group" },
  { id: 4, name: "류현진", email: "ryu@example.com", role: "user", type: "user" },
  { id: 5, name: "이강인", email: "lee@example.com", role: "admin", type: "user" },
  { id: 6, name: "Design Group", email: "design@daruda.io", role: "user", type: "group" },
  { id: 7, name: "추신수", email: "choo@example.com", role: "user", type: "user" },
  { id: 8, name: "김하성", email: "ha@example.com", role: "user", type: "user" },
  { id: 9, name: "이정후", email: "lee2@example.com", role: "user", type: "user" },
  { id: 10, name: "고우석", email: "ko@example.com", role: "user", type: "user" },
];

export default function PermissionPage() {
  const [users, setUsers] = useState<PermissionUser[]>(MOCK_USERS_LIST);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  // Pagination (Mock)
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.includes(searchQuery) || u.email.includes(searchQuery);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Calculate pagination
  const totalItems = filteredUsers.length;

  const handleResetFilter = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setCurrentPage(1);
  };

  const handleRoleChange = (id: number, newRole: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    toast.success("사용자 권한이 변경되었습니다.");
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("정말로 이 사용자/그룹을 삭제하시겠습니까?")) {
      setUsers(users.filter(u => u.id !== id));
      toast.success("삭제되었습니다.");
    }
  };

  return (
    <PageContainer maxWidth="full" className="p-4 lg:p-6 space-y-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <PageHeader
          title="권한 관리"
          description="시스템 접근 권한 및 관리자 설정을 관리합니다."
          className="mb-0"
        />

        <Button
          onClick={() => setIsAddUserDialogOpen(true)}
          className="bg-sky-600 hover:bg-sky-700 text-white gap-2 rounded-xl shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold text-sm">사용자 추가</span>
        </Button>
      </div>

      <AddUserDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
      />

      {/* Filtering Toolbar */}
      <div className="shrink-0">
        <PermissionFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          onReset={handleResetFilter}
        />
      </div>

      {/* Permission Table Area - Flex Grow to fill height */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PermissionTable
          users={filteredUsers}
          onRoleChange={handleRoleChange}
          onDelete={handleDeleteUser}
          className="flex-1 h-full"
        >
          <Pagination
            totalItems={totalItems}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            className="mt-auto bg-white border-t border-slate-50 p-2"
          />
        </PermissionTable>
      </div>
    </PageContainer>
  );
}
