import { submitShowForFinancialCloseAction } from '@/app/actions/financial-close'

export function SubmitFinancialCloseButton({
  showId,
  showStatus,
  activeVersionType,
}: {
  showId: string
  showStatus: string | null
  activeVersionType: 'pre' | 'post'
}) {
  if (activeVersionType !== 'post') {
    return null
  }

  if (showStatus === 'financial_closed') {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
        Financial Closed
      </div>
    )
  }

  return (
    <form action={submitShowForFinancialCloseAction}>
      <input type="hidden" name="showId" value={showId} />
      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
      >
        Submit for Financial Close
      </button>
    </form>
  )
}