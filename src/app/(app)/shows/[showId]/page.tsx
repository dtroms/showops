import { redirect } from 'next/navigation'

export default async function ShowRootPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  redirect(`/shows/${showId}/budget-summary`)
}