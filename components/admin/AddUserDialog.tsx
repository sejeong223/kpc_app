"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search, User, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const MOCK_USERS = [
  { id: "u1", name: "김철수", email: "kim@example.com", type: "user" },
  { id: "u2", name: "이영희", email: "lee@example.com", type: "user" },
  { id: "u3", name: "박지성", email: "park@example.com", type: "user" },
  { id: "u4", name: "최동원", email: "choi@example.com", type: "user" },
  { id: "u5", name: "정민지", email: "jung@example.com", type: "user" },
];

const MOCK_GROUPS = [
  { id: "g1", name: "SalesAgents", type: "group", category: "security" },
  { id: "g2", name: "HelpdeskAgents", type: "group", category: "security" },
  { id: "g3", name: "AAD DC Administrators", type: "group", category: "security" },
  { id: "g4", name: "DT Consulting 팀_Group", type: "group", category: "security" },
  { id: "g5", name: "Power Page팀_Group", type: "group", category: "security" },
  { id: "g6", name: "M365 Users", type: "group", category: "m365" },
];

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const [selectedTab, setSelectedTab] = useState("user");
  const [groupCategory, setGroupCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Filter Logic
  const filteredUsers = MOCK_USERS.filter(u =>
    u.name.includes(searchQuery) || u.email.includes(searchQuery)
  );

  const filteredGroups = MOCK_GROUPS.filter(g =>
    (groupCategory === "all" || g.category === groupCategory) &&
    g.name.includes(searchQuery)
  );

  const displayItems = selectedTab === "user" ? filteredUsers : filteredGroups;

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getSelectedItemDetails = (id: string) => {
    const user = MOCK_USERS.find(u => u.id === id);
    if (user) return { ...user, icon: User };
    const group = MOCK_GROUPS.find(g => g.id === id);
    if (group) return { ...group, icon: Users };
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col h-[600px]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>사용자 추가</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Selection */}
          <div className="w-[60%] border-r border-slate-100 flex flex-col p-6 pt-0 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="사용자 또는 그룹 검색..."
                className="pl-9 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-40 grid-cols-2 h-9">
                <TabsTrigger value="user">사용자</TabsTrigger>
                <TabsTrigger value="group">그룹</TabsTrigger>
              </TabsList>

              {selectedTab === "group" && (
                <div className="flex gap-2 mt-4 text-sm">
                  <span className="font-bold text-slate-600 mt-1">그룹 유형</span>
                  <div className="flex gap-1">
                    {["all", "m365", "security"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setGroupCategory(cat)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                          groupCategory === cat
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {cat === "all" ? "모든 그룹" : cat === "m365" ? "M365" : "보안그룹"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ScrollArea className="h-[360px] mt-4 border border-slate-200 rounded-lg">
                <div className="divide-y divide-slate-100">
                  {displayItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors",
                        selectedItems.includes(item.id) && "bg-sky-50 hover:bg-sky-100"
                      )}
                      onClick={() => toggleSelection(item.id)}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                        selectedItems.includes(item.id) ? "bg-sky-600 border-sky-600" : "border-slate-300 bg-white"
                      )}>
                        {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>

                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                        {item.type === "user" ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                        {item.type === "group" && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full w-fit">{(item as any).category === 'security' ? 'Security' : 'M365'}</span>}
                      </div>
                    </div>
                  ))}
                  {displayItems.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Right Panel: Selected Items */}
          <div className="hidden md:flex flex-col flex-1 p-6 pt-0 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4 mt-1">
              <h3 className="font-bold text-slate-700">선택된 사용자 ({selectedItems.length}명)</h3>
            </div>

            <div className="border-t border-slate-200" />

            <ScrollArea className="flex-1 mt-4">
              <div className="space-y-2">
                {selectedItems.map(id => {
                  const item = getSelectedItemDetails(id);
                  if (!item) return null;
                  const Icon = item.icon;

                  return (
                    <div key={id} className="flex items-center justify-between p-2.5 bg-white rounded-lg shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium truncate">{item.name}</span>
                      </div>
                      <button
                        onClick={() => toggleSelection(id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {selectedItems.length === 0 && (
                  <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                    선택된 항목이 없습니다.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-6">취소</Button>
          <Button onClick={() => onOpenChange(false)} className="bg-sky-600 hover:bg-sky-700 text-white h-10 px-6">
            추가 ({selectedItems.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
