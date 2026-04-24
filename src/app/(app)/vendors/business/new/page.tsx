import { VendorPartnerProfileForm } from '@/components/vendors/vendor-partner-profile-form'

export default function NewBusinessVendorPage() {
  return (
    <div className="p-6">
      <VendorPartnerProfileForm mode="create" />
    </div>
  )
}