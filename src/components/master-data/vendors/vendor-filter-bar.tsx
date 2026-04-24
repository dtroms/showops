'use client'

type VendorFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}

export function VendorFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: VendorFilterBarProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search vendors"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none"
        />

        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="all" className="bg-slate-900 text-white">All Vendor Types</option>
          <option value="freelance" className="bg-slate-900 text-white">Freelance</option>
          <option value="gear_rental" className="bg-slate-900 text-white">Gear Rental</option>
          <option value="both" className="bg-slate-900 text-white">Both</option>
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