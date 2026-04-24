type BudgetSnapshot = {
  gear_total: number | null
  w2_labor_total: number | null
  vendor_total: number | null
  supply_total: number | null
  travel_total: number | null
  shipping_total: number | null
  expedited_total: number | null
  company_owned_gear_allocation: number | null
  company_owned_gear_percent: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
}

type ShowHeaderProps = {
  show: {
    id: string
    show_name: string
    show_number: string | null
    status: string | null
    start_date: string | null
    end_date: string | null
    city: string | null
    state: string | null
    venue_name: string | null
    client_name: string | null
  }
  summary: {
    estimated_revenue: number | null
    total_estimated_cost: number | null
    projected_profit: number | null
    margin_percent: number | null
    pre: BudgetSnapshot
    post: BudgetSnapshot | null
  }
  readiness: {
    crew_count: number
    freelancer_count: number
    vendor_count: number
    note_count: number
    file_count: number
  }
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function CompactSectionBucket({
  title,
  preValue,
  postValue,
  postReady = true,
  isPercent = false,
}: {
  title: string
  preValue: number | null | undefined
  postValue: number | null | undefined
  postReady?: boolean
  isPercent?: boolean
}) {
  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—'
    return isPercent ? formatPercent(value) : formatCurrency(value)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Pre
          </span>
          <span className="text-base font-semibold text-slate-900">
            {formatValue(preValue)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Post
          </span>
          <span className="text-base font-semibold text-slate-900">
            {postReady ? formatValue(postValue) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function RevenueBucket({
  revenue,
  postReady,
}: {
  revenue: number | null | undefined
  postReady: boolean
}) {
  const value = formatCurrency(revenue)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Revenue
      </p>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Pre
          </span>
          <span className="text-base font-semibold text-slate-900">{value}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Post
          </span>
          <span className="text-base font-semibold text-slate-900">
            {postReady ? value : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function statusTone(status: string | null): 'info' | 'success' | 'warning' | 'default' {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'active' || normalized === 'in_progress') return 'info'
  if (normalized === 'completed') return 'success'
  if (normalized === 'draft' || normalized === 'planning') return 'warning'
  return 'default'
}

function StatusBadge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'info' | 'success' | 'warning' | 'default'
}) {
  const tones = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
  )
}

export function ShowHeader({ show, summary, readiness }: ShowHeaderProps) {
  const postReady = Boolean(summary.post)

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {show.show_name}
              </h1>

              {show.show_number ? <StatusBadge label={`#${show.show_number}`} /> : null}
              {show.client_name ? <StatusBadge label={show.client_name} /> : null}
              <StatusBadge label={show.status ?? 'unknown'} tone={statusTone(show.status)} />
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {[
                show.venue_name,
                [show.city, show.state].filter(Boolean).join(', '),
                `${formatDate(show.start_date)} - ${formatDate(show.end_date)}`,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Crew
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {readiness.crew_count}
              </p>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Freelancers
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {readiness.freelancer_count}
              </p>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Vendors
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {readiness.vendor_count}
              </p>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Notes / Files
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {readiness.note_count} / {readiness.file_count}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3">
            <p className="font-semibold text-slate-900">Financial Snapshot</p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <RevenueBucket revenue={summary.estimated_revenue} postReady={postReady} />

            <CompactSectionBucket
              title="Total Cost"
              preValue={summary.pre.total_estimated_cost}
              postValue={summary.post?.total_estimated_cost}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Projected Profit"
              preValue={summary.pre.projected_profit}
              postValue={summary.post?.projected_profit}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Margin"
              preValue={summary.pre.margin_percent}
              postValue={summary.post?.margin_percent}
              postReady={postReady}
              isPercent
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <CompactSectionBucket
              title="Cross Rental Equipment"
              preValue={summary.pre.gear_total}
              postValue={summary.post?.gear_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="W2 Labor"
              preValue={summary.pre.w2_labor_total}
              postValue={summary.post?.w2_labor_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Freelance Labor"
              preValue={summary.pre.vendor_total}
              postValue={summary.post?.vendor_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Supplies"
              preValue={summary.pre.supply_total}
              postValue={summary.post?.supply_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Travel"
              preValue={summary.pre.travel_total}
              postValue={summary.post?.travel_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Shipping"
              preValue={summary.pre.shipping_total}
              postValue={summary.post?.shipping_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Expedited"
              preValue={summary.pre.expedited_total}
              postValue={summary.post?.expedited_total}
              postReady={postReady}
            />

            <CompactSectionBucket
              title="Company-Owned Gear"
              preValue={summary.pre.company_owned_gear_allocation}
              postValue={summary.post?.company_owned_gear_allocation}
              postReady={postReady}
            />
          </div>
        </div>
      </div>
    </div>
  )
}