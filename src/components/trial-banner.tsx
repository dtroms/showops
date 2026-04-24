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
    <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-200">
      <span className="font-semibold">Trial active</span>
      {trialEndsAt ? ` until ${new Date(trialEndsAt).toLocaleDateString()}` : ''}.
    </div>
  )
}