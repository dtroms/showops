type PrimaryServiceArea = {
  label: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  service_radius_miles: number | null
  service_mode: 'local' | 'regional' | 'national' | null
  notes: string | null
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

export function PrimaryServiceAreaSection({
  primaryArea,
}: {
  primaryArea?: PrimaryServiceArea | null
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-lg font-semibold text-white">Primary Service Area</h3>
      <p className="mt-1 text-sm text-slate-400">
        This is the home market or primary coverage area used for nearby partner matching.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-300">Label</label>
          <input
            name="serviceAreaLabel"
            defaultValue={primaryArea?.label ?? 'Primary'}
            className={fieldClass()}
            placeholder="Primary, HQ, Nashville Base, Tampa Market, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Service Mode</label>
          <select
            name="serviceAreaMode"
            defaultValue={primaryArea?.service_mode ?? 'local'}
            className={fieldClass()}
          >
            <option value="local" className="bg-slate-900 text-white">Local</option>
            <option value="regional" className="bg-slate-900 text-white">Regional</option>
            <option value="national" className="bg-slate-900 text-white">National</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300">City</label>
          <input
            name="serviceAreaCity"
            defaultValue={primaryArea?.city ?? ''}
            required
            className={fieldClass()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">State</label>
          <input
            name="serviceAreaState"
            defaultValue={primaryArea?.state ?? ''}
            required
            className={fieldClass()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Postal Code</label>
          <input
            name="serviceAreaPostalCode"
            defaultValue={primaryArea?.postal_code ?? ''}
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-300">Country</label>
          <input
            name="serviceAreaCountry"
            defaultValue={primaryArea?.country ?? 'USA'}
            className={fieldClass()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Service Radius (Miles)</label>
          <input
            name="serviceAreaRadiusMiles"
            type="number"
            min="1"
            defaultValue={primaryArea?.service_radius_miles ?? 50}
            required
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300">Service Area Notes</label>
        <textarea
          name="serviceAreaNotes"
          rows={3}
          defaultValue={primaryArea?.notes ?? ''}
          className={fieldClass()}
          placeholder="Covers surrounding metro, prefers local calls, regular Southeast coverage, etc."
        />
      </div>
    </div>
  )
}