export function GearStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
      Active
    </span>
  ) : (
    <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-400">
      Inactive
    </span>
  )
}