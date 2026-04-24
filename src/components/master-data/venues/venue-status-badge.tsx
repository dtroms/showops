export function VenueStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        isActive
          ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
          : 'border-white/10 bg-white/10 text-slate-400'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}