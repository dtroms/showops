type CoverageAndTravelSectionProps = {
  travelAvailable?: boolean | null
  preferredVendor?: boolean | null
  nationwideCoverage?: boolean | null
  travelNotes?: string | null
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

export function CoverageAndTravelSection({
  travelAvailable,
  preferredVendor,
  nationwideCoverage,
  travelNotes,
}: CoverageAndTravelSectionProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-lg font-semibold text-white">Coverage & Travel</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
          <input
            type="checkbox"
            name="travelAvailable"
            value="true"
            defaultChecked={Boolean(travelAvailable)}
          />
          <span className="text-sm">Travel Available</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
          <input
            type="checkbox"
            name="preferredVendor"
            value="true"
            defaultChecked={Boolean(preferredVendor)}
          />
          <span className="text-sm">Preferred Partner</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
          <input
            type="checkbox"
            name="nationwideCoverage"
            value="true"
            defaultChecked={Boolean(nationwideCoverage)}
          />
          <span className="text-sm">Nationwide Coverage</span>
        </label>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300">Travel Notes</label>
        <textarea
          name="travelNotes"
          rows={3}
          defaultValue={travelNotes ?? ''}
          className={fieldClass()}
          placeholder="Will fly nationwide, prefers hotel buyout, local in Southeast, has truck access, etc."
        />
      </div>
    </div>
  )
}