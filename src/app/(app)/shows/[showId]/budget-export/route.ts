import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ showId: string }> }
) {
  const { showId } = await context.params
  const url = new URL(request.url)

  const redirectUrl = new URL(
    `/api/shows/${showId}/budget-export${url.search}`,
    request.url
  )

  return NextResponse.redirect(redirectUrl)
}