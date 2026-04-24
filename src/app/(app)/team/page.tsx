import { redirect } from 'next/navigation'

export default async function LegacyTeamPage() {
  redirect('/settings/users')
}