import { createClient } from '@/lib/supabase/server'
import { VendorPartnersPageShell } from '@/components/vendors/vendor-partners-page-shell'

export default async function FreelancePartnersPage() {
  const supabase = await createClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select(`
      id,
      vendor_name,
      vendor_type,
      partner_kind,
      freelancer_name,
      business_name,
      service_type,
      contact_name,
      email,
      phone,
      default_cost,
      notes,
      is_active
    `)
    .eq('partner_kind', 'freelancer')
    .order('freelancer_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <VendorPartnersPageShell
      title="Freelance Partners"
      description="Manage freelance operators, technicians, and labor partners used for show staffing."
      partnerKind="freelancer"
      vendors={vendors ?? []}
    />
  )
}