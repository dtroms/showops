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
    <div className="rounded-2xl border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search vendors"
          className="rounded-lg border px-3 py-2"
        />

        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Vendor Types</option>
          <option value="freelance">Freelance</option>
          <option value="gear_rental">Gear Rental</option>
          <option value="both">Both</option>
        </select>

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