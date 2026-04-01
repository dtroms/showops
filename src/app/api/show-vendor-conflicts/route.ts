import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const showId = String(body.showId || '')
  const vendorId = String(body.vendorId || '')

  if (!showId || !vendorId) {
    return NextResponse.json({ error: 'showId and vendorId are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_vendor_conflicts_for_show', {
    target_show_id: showId,
    target_vendor_id: vendorId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conflicts: data ?? [] })
}
