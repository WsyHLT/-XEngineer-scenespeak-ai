"use client";

type Props = {
  minutes: number;
  goalMinutes: number;
  streakDays: number;
};

function MicIcon() {
  return (
    <svg className="mb-1 h-5 w-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V19H9a1 1 0 100 2h6a1 1 0 100-2h-2v-1.08A7 7 0 0019 11z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.577 1.567-4.5 3-6 .5-.667 1-1.333 1.5-2 .5.667 1 1.333 1.5 2 1.433 1.5 3 3.423 3 6 0 3.866-3.134 7-7 7zm0-2c2.761 0 5-2.239 5-5 0-1.714-1.086-3.286-2.286-4.714C14.286 10.714 13.571 9.714 13 8.714 12.429 9.714 11.714 10.714 11.286 11.286 10.086 12.714 9 14.286 9 16c0 2.761 2.239 5 5 5z" />
    </svg>
  );
}

export default function DailyGoalRing({ minutes, goalMinutes, streakDays }: Props) {
  const progress = Math.min(minutes / goalMinutes, 1);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#goalGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <MicIcon />
          <span className="text-2xl font-bold tabular-nums text-slate-900">{minutes}</span>
          <span className="text-xs text-slate-500">/ {goalMinutes} 分钟</span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-medium text-slate-700">今日练习进度</p>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 ring-1 ring-orange-100">
        <FlameIcon />
        连续打卡 {streakDays} 天
      </span>
    </div>
  );
}
