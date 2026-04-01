import { formatShortDate } from '@/lib/format'

type ShowHeaderProps = {
  show: {
    id: string
    show_name: string
    show_number: string | null
    status: string | null
    start_date: string | null
    end_date: string | null
  }
  compact?: boolean
}

function statusClasses(status: string | null) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'quoted':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'completed':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'archived':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function ShowHeader({ show, compact = false }: ShowHeaderProps) {
  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
              {show.show_name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
                #{show.show_number ?? '—'}
              </span>

              <span
                className={`inline-flex rounded-full border px-2 py-1 font-semibold uppercase tracking-wide ${statusClasses(
                  show.status
                )}`}
              >
                {show.status ?? 'draft'}
              </span>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                {formatShortDate(show.start_date)} - {formatShortDate(show.end_date)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{show.show_name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Show #{show.show_number ?? '—'}
          </p>
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(
            show.status
          )}`}
        >
          {show.status ?? 'draft'}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Show Number
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {show.show_number ?? '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {show.status ?? '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Start Date
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatShortDate(show.start_date)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            End Date
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatShortDate(show.end_date)}
          </p>
        </div>
      </div>
    </div>
  )
}