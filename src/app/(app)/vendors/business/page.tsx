import { createClient } from '@/lib/supabase/server'
import { VendorPartnersPageShell } from '@/components/vendors/vendor-partners-page-shell'

export default async function BusinessVendorPartnersPage() {
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
    .eq('partner_kind', 'business')
    .order('business_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <VendorPartnersPageShell
      title="Vendor Partners"
      description="Manage business vendors, rental houses, fabrication partners, and outside service providers."
      partnerKind="business"
      vendors={vendors ?? []}
    />
  )
}