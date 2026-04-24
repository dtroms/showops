'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { addVendorToShowFromShowPartners } from '@/app/actions/show-vendors'

type NearbyPartnerRow = {
  id: string
  vendorId: string
  vendorName: string
  partnerKind: 'freelancer' | 'business'
  serviceType: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  preferredVendor: boolean
  nationwideCoverage: boolean
  travelAvailable: boolean
  averageRating: number | null
  ratingCount: number
  distanceMiles: number | null
  matchReason: string
  serviceAreaCity: string | null
  serviceAreaState: string | null
  serviceAreaNotes: string | null
  vendorNotes: string | null
  alreadyAssigned: boolean
}

function formatDistance(value: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value)} mi`
}

function StarRating({
  average,
  count,
}: {
  average?: number | null
  count?: number | null
}) {
  if (!count) return <span className="text-xs text-slate-500">No ratings</span>
  const rounded = Math.round(average ?? 0)
  const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded)

  return (
    <span className="text-xs text-slate-400">
      <span className="mr-2 text-amber-300">{stars}</span>
      {(average ?? 0).toFixed(1)} ({count})
    </span>
  )
}

function AddToShowButton({ showId, vendorId }: { showId: string; vendorId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const fd = new FormData()
          fd.set('showId', showId)
          fd.set('vendorId', vendorId)
          await addVendorToShowFromShowPartners(fd)
          window.location.reload()
        })
      }
      disabled={pending}
      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Adding...' : 'Add to Show'}
    </button>
  )
}

function PartnerCard({ row, showId }: { row: NearbyPartnerRow; showId: string }) {
  const vendorPath =
    row.partnerKind === 'freelancer'
      ? `/vendors/freelance/${row.vendorId}`
      : `/vendors/business/${row.vendorId}`

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-semibold text-white">{row.vendorName}</h4>

              {row.preferredVendor ? (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  Preferred
                </span>
              ) : null}

              {row.nationwideCoverage ? (
                <span className="rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300">
                  Nationwide
                </span>
              ) : null}

              {row.alreadyAssigned ? (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  Already Assigned
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span>
                {[row.serviceType, row.partnerKind === 'freelancer' ? 'Freelancer' : 'Vendor Partner']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {row.partnerKind === 'freelancer' ? (
                <StarRating average={row.averageRating} count={row.ratingCount} />
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contact</p>
              <p className="mt-1 text-sm text-slate-300">{row.contactName ?? '—'}</p>
              <p className="text-sm text-slate-400">{row.email ?? '—'}</p>
              <p className="text-sm text-slate-400">{row.phone ?? '—'}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Service Area</p>
              <p className="mt-1 text-sm text-slate-300">
                {row.serviceAreaCity && row.serviceAreaState
                  ? `${row.serviceAreaCity}, ${row.serviceAreaState}`
                  : 'Nationwide / general coverage'}
              </p>
              <p className="text-sm text-slate-400">{row.matchReason}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Match</p>
              <p className="mt-1 text-sm text-slate-300">Distance: {formatDistance(row.distanceMiles)}</p>
              <p className="text-sm text-slate-400">Travel: {row.travelAvailable ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {row.serviceAreaNotes || row.vendorNotes ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              {row.serviceAreaNotes ? (
                <p className="text-sm text-slate-400">
                  <span className="font-medium text-white">Area Notes:</span> {row.serviceAreaNotes}
                </p>
              ) : null}
              {row.vendorNotes ? (
                <p className="mt-1 text-sm text-slate-400">
                  <span className="font-medium text-white">Vendor Notes:</span> {row.vendorNotes}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Link
            href={vendorPath}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Open Profile
          </Link>

          {row.partnerKind === 'freelancer' ? (
            row.alreadyAssigned ? (
              <Link
                href={`/shows/${showId}/vendors`}
                className="rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                Manage Assignment
              </Link>
            ) : (
              <AddToShowButton showId={showId} vendorId={row.vendorId} />
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6">
      <h4 className="text-base font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  )
}

export function NearbyPartnersPanel({
  rows,
  showId,
}: {
  rows: NearbyPartnerRow[]
  showId: string
}) {
  const [kind, setKind] = useState<'all' | 'freelancer' | 'business'>('all')

  const filtered = useMemo(() => {
    if (kind === 'all') return rows
    return rows.filter((row) => row.partnerKind === kind)
  }, [rows, kind])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['all', 'freelancer', 'business'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              kind === option
                ? 'border-white bg-white text-slate-950'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {option === 'all' ? 'All' : option === 'freelancer' ? 'Freelancers' : 'Vendors'}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState title="No nearby partners found" body="There are no nearby freelancer or vendor matches for this show yet." />
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <PartnerCard key={`${row.partnerKind}-${row.id}`} row={row} showId={showId} />
          ))}
        </div>
      )}
    </div>
  )
}