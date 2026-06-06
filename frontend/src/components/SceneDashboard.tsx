"use client";

import CockpitConsole from "@/components/cockpit/CockpitConsole";
import ScenarioMatrix from "@/components/cockpit/ScenarioMatrix";
import {
  pickBlindBoxScenario,
  type CockpitScenario,
} from "@/lib/cockpitMockData";
import type { Scene } from "@/types/api";

type Props = {
  backendScenes: Scene[];
  loading?: boolean;
  onSelect: (scene: Scene) => void;
  onSelectError?: (message: string) => void;
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

export default function SceneDashboard({ backendScenes, loading, onSelect, onSelectError }: Props) {
  const launch = (cockpit: CockpitScenario) => {
    const merged = mergeCockpitScene(cockpit, backendScenes);
    if (!merged) {
      onSelectError?.("场景暂未就绪，请确认后端已启动 (localhost:8000)");
      return;
    }
    onSelect(merged);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F19] text-slate-100">
      {/* 环境光晕 */}
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[80px]" />

      {/* 顶栏 */}
      <header className="relative z-10 border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-neon">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">SceneSpeak AI</p>
              <p className="text-[10px] uppercase tracking-widest text-indigo-400/70">
                Speaking Time Capsule
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 outline-none sm:block"
              defaultValue="intermediate"
              aria-label="难度"
            >
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
            <select
              className="hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 outline-none md:block"
              defaultValue="us"
              aria-label="口音"
            >
              <option value="us">美式 US</option>
              <option value="uk">英式 UK</option>
              <option value="exam">考官模式</option>
            </select>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold ring-2 ring-indigo-500/30">
              U
            </div>
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
            <ScenarioMatrix loading={loading} onSelectScenario={launch} />
          </div>
        </div>
      </main>
    </div>
  );
}
