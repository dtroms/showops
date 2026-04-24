'use client'

export function GearFilterBar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  categories,
}: {
  search: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  categories: string[]
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search gear"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none"
        />

        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="all" className="bg-slate-900 text-white">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category} className="bg-slate-900 text-white">
              {category}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="active" className="bg-slate-900 text-white">Active</option>
          <option value="inactive" className="bg-slate-900 text-white">Inactive</option>
          <option value="all" className="bg-slate-900 text-white">All Statuses</option>
        </select>
      </div>
    </div>
  )
}