export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f1d58a" /><stop offset="1" stopColor="#c99a2e" /></linearGradient></defs>
      <rect width="64" height="64" rx="16" fill="#0b1030" stroke="rgba(241,213,138,.35)" />
      <path d="M12 42c6-4 14-4 20 0 6-4 14-4 20 0V22c-6-4-14-4-20 0-6-4-14-4-20 0z" fill="none" stroke="url(#gold)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 24l5 10-5 6-5-6z" fill="url(#gold)" /><path d="M48 12l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="url(#gold)" opacity=".9" />
    </svg>
  )
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={compact ? 34 : 42} />
      <div className="leading-tight">
        <div className="font-display text-lg font-bold bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">English by Kami</div>
        {!compact && <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Academic Writing Coach</div>}
      </div>
    </div>
  )
}
