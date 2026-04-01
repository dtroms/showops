'use client'

export function SuppliesFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search supplies"
          className="rounded-lg border px-3 py-2"
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Statuses</option>
        </select>
      </div>
    </div>
  )
}