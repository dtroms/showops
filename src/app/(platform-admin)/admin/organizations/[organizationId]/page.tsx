import { redirect } from 'next/navigation'

export default async function AdminOrganizationRootPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params
  redirect(`/admin/organizations/${organizationId}/billing`)
}