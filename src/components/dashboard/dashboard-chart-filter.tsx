'use client'

export function DashboardChartFilter({
  value,
  onChange,
}: {
  value: 'week' | 'month' | 'quarter' | 'year'
  onChange: (value: 'week' | 'month' | 'quarter' | 'year') => void
}) {
  const options = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: '3 Months' },
    { value: 'year', label: 'Year' },
  ] as const

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-2 text-sm ${
            value === option.value ? 'bg-slate-900 text-white' : 'border bg-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}