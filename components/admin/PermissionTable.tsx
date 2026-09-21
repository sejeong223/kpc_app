"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users, Shield, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PermissionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  type: "user" | "group";
}

interface PermissionTableProps {
  users: PermissionUser[];
  onRoleChange: (id: number, newRole: string) => void;
  onDelete: (id: number) => void;
  className?: string;
  children?: React.ReactNode;
}

export function PermissionTable({ users, onRoleChange, onDelete, className, children }: PermissionTableProps) {
  return (
    <Card className={cn("border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white flex flex-col", className)}>
      <div className="px-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-slate-500" />
          사용자 목록
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          총 <span className="text-sky-600">{users.length}</span>명
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px] font-bold text-slate-600">이름 / 그룹</TableHead>
              <TableHead className="font-bold text-slate-600">이메일</TableHead>
              <TableHead className="w-[150px] font-bold text-slate-600">권한</TableHead>
              <TableHead className="w-[80px] font-bold text-slate-600 text-center">삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      {user.type === 'group' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <span className="text-slate-700">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(val) => onRoleChange(user.id, val)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 w-[110px] text-xs font-bold border-0 ring-1 ring-inset",
                        user.role === "admin"
                          ? "bg-rose-50 text-rose-700 ring-rose-200"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {user.role === "admin" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">사용자</SelectItem>
                      <SelectItem value="admin">관리자</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                    onClick={() => onDelete(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-slate-400">
                  조건에 맞는 사용자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      </div>
      {children}
    </Card>
  );
}
