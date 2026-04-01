'use client'

export function AllShowsSortSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border px-3 py-2"
    >
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="highest_revenue">Highest Revenue</option>
      <option value="highest_cost">Highest Cost</option>
      <option value="highest_profit">Highest Profit</option>
      <option value="highest_margin">Highest Margin</option>
    </select>
  )
}