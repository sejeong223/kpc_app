"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";

export function RaccoonHero() {
  return (
    <div className="relative w-full overflow-hidden mb-1">
      <Card className="p-3 border-none bg-sky-50/50 shadow-none overflow-hidden relative flex items-center justify-center">
        <div className="flex flex-row items-start gap-4 relative z-10 w-full px-2">
          {/* Raccoon Character - Background removed as requested */}
          <div className="relative shrink-0 animate-bounce-slow pt-2">
            <div className="w-16 h-16 xl:w-20 xl:h-20 flex items-center justify-center">
              <Image
                src="/raccoon.png"
                alt="AI Raccoon Agent"
                width={80}
                height={80}
                className="object-contain drop-shadow-md"
              />
            </div>
          </div>

          {/* Speech Bubble and Floating Languages Area */}
          <div className="flex-1 flex flex-col pt-1 relative min-w-0">
            {/* Speech Bubble - Moved up with a pointer */}
            <div className="inline-block self-start px-3 py-1.5 bg-white rounded-2xl shadow-sm border border-slate-100 relative mb-1 transform -translate-y-1">
              <p className="text-slate-700 font-bold text-[10px] xl:text-xs whitespace-pre-line leading-tight">
                AI랑 124개 언어로 후다닥 번역! 📑
              </p>
              {/* Pointer */}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-100 rotate-45" />
            </div>

            {/* Floating 3D Language Elements - Within this area */}
            <div className="absolute right-0 top-0 w-24 h-24 pointer-events-none hidden md:block">
              {/* English A */}
              <div className="absolute top-0 right-4 bg-white/70 backdrop-blur-sm border border-white/80 px-1.5 py-0.5 rounded-lg shadow-sm text-[10px] font-bold text-sky-600 animate-float-1 transform rotate-[-12deg]">
                A
              </div>
              {/* Japanese あ */}
              <div className="absolute bottom-2 right-12 bg-white/60 backdrop-blur-sm border border-white/60 px-1.5 py-0.5 rounded-md shadow-sm text-[9px] font-bold text-indigo-500 animate-float-2 transform rotate-[8deg]">
                あ
              </div>
              {/* Chinese 中 */}
              <div className="absolute top-4 right-16 bg-white/50 backdrop-blur-sm border border-white/40 px-1.5 py-0.5 rounded-md shadow-sm text-[9px] font-bold text-rose-500 animate-float-3 transform rotate-[-6deg]">
                中
              </div>
              {/* EN Pill */}
              <div className="absolute bottom-6 right-0 bg-sky-500/10 backdrop-blur-[2px] border border-sky-200/50 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-sky-500 animate-float-1">
                EN
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Background Decors (Scoped) */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-36 h-48 bg-blue-50/40 rounded-full blur-3xl" />
      </Card>
    </div>
  );
}
