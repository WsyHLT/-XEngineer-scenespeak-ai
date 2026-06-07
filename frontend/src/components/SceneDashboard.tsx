"use client";

import { useEffect } from "react";

import CockpitConsole from "@/components/cockpit/CockpitConsole";
import DifficultyAccentTips from "@/components/cockpit/DifficultyAccentTips";
import ScenarioMatrix from "@/components/cockpit/ScenarioMatrix";
import Squircle from "@/components/ui/Squircle";
import { IconMicLogo } from "@/components/ui/CyberIcons";
import {
  pickBlindBoxScenario,
  type CockpitScenario,
} from "@/lib/cockpitMockData";
import { SQUIRCLE_LG } from "@/lib/designSystem";
import type { Scene } from "@/types/api";

type Props = {
  backendScenes: Scene[];
  loading?: boolean;
  onSelect: (scene: Scene) => void;
  onSelectError?: (message: string) => void;
  scrollToHistory?: boolean;
  onScrolledToHistory?: () => void;
};

/** 将 UI 场景映射到后端可用 Scene，保留展示文案 */
export function mergeCockpitScene(
  cockpit: CockpitScenario,
  backendScenes: Scene[],
): Scene | null {
  const base = backendScenes.find((s) => s.id === cockpit.backendSceneId);
  if (!base) return null;
  return {
    ...base,
    name_zh: cockpit.name_zh,
    name: cockpit.name,
    description: cockpit.description,
    icon: cockpit.icon,
  };
}

export default function SceneDashboard({
  backendScenes,
  loading,
  onSelect,
  onSelectError,
  scrollToHistory,
  onScrolledToHistory,
}: Props) {
  useEffect(() => {
    if (!scrollToHistory) return;
    const timer = window.setTimeout(() => {
      document.getElementById("history-stream")?.scrollIntoView({ behavior: "smooth", block: "start" });
      onScrolledToHistory?.();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [scrollToHistory, onScrolledToHistory]);

  const launch = (cockpit: CockpitScenario) => {
    const merged = mergeCockpitScene(cockpit, backendScenes);
    if (!merged) {
      onSelectError?.("场景暂未就绪，请确认后端已启动 (localhost:8000)");
      return;
    }
    onSelect(merged);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#0B0F19] text-slate-100 cyber-scrollbar">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[80px]" />

      <header className="relative z-10 bg-[#0B0F19]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Squircle
              size="md"
              className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-depth"
            >
              <IconMicLogo className="h-5 w-5" />
            </Squircle>
            <div>
              <p className="text-sm font-bold text-slate-50">SceneSpeak AI</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                Speaking Time Capsule
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className={`hidden ${SQUIRCLE_LG} bg-indigo-950/25 px-3 py-2 text-xs text-slate-400 outline-none backdrop-blur-sm sm:block`}
              defaultValue="intermediate"
              aria-label="难度"
            >
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
            <select
              className={`hidden ${SQUIRCLE_LG} bg-indigo-950/25 px-3 py-2 text-xs text-slate-400 outline-none backdrop-blur-sm md:block`}
              defaultValue="us"
              aria-label="口音"
            >
              <option value="us">美式 US</option>
              <option value="uk">英式 UK</option>
              <option value="exam">考官模式</option>
            </select>
            <DifficultyAccentTips />
            <Squircle
              size="sm"
              className="bg-gradient-to-br from-slate-600 to-slate-800 font-data text-xs font-bold text-slate-200 shadow-depth"
            >
              U
            </Squircle>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-1">
            <CockpitConsole
              loading={loading}
              onBlindBox={() => launch(pickBlindBoxScenario())}
            />
          </div>
          <div className="lg:col-span-2">
            <ScenarioMatrix
              loading={loading}
              onSelectScenario={launch}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
