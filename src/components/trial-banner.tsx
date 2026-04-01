export function TrialBanner({
  subscriptionStatus,
  trialEndsAt,
}: {
  subscriptionStatus: string
  trialEndsAt: string | null
}) {
  if (subscriptionStatus !== 'trialing') {
    return null
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
      <span className="font-semibold">Trial active</span>
      {trialEndsAt ? ` until ${new Date(trialEndsAt).toLocaleDateString()}` : ''}.
    </div>
  )
}