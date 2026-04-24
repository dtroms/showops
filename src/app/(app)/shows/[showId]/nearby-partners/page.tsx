import { redirect } from 'next/navigation'

export default async function NearbyPartnersPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  redirect(`/shows/${showId}/vendors`)
}