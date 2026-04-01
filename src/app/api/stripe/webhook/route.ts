import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe webhook not configured yet.' },
    { status: 501 }
  )
}