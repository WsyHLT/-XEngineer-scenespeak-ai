"use client";

import InteractiveRadarChart from "@/components/chat/InteractiveRadarChart";
import type { SkillScores } from "@/types/history";

type Props = { skills: SkillScores };

/** @deprecated 请使用 InteractiveRadarChart — 保留兼容 CockpitConsole */
export default function GlassRadar({ skills }: Props) {
  return <InteractiveRadarChart skills={skills} />;
}
