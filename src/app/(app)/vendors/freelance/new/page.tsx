import { FreelancerProfileForm } from '@/components/vendors/freelancer-profile-form'

export default function NewFreelanceVendorPage() {
  return (
    <div className="p-6">
      <FreelancerProfileForm mode="create" />
    </div>
  )
}