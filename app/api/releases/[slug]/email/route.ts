import { NextResponse } from 'next/server'
import { getReleaseBySlug } from '@/content/releases'
import {
  renderReleaseEmail,
  renderReleaseEmailText,
  getEmailSubject,
  getEmailPreviewText,
} from '@/lib/releases/email'

type RouteParams = {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params
  const release = getReleaseBySlug(resolvedParams.slug)

  if (!release) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const format = url.searchParams.get('format')
  const baseUrl =
    url.searchParams.get('baseUrl') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://suplex.studio'

  try {
    // Return raw HTML for preview in browser
    if (format === 'html') {
      const html = await renderReleaseEmail(release, { baseUrl })
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Return plain text version
    if (format === 'text') {
      const text = await renderReleaseEmailText(release, { baseUrl })
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Default: return JSON with all email data
    const html = await renderReleaseEmail(release, { baseUrl })
    const text = await renderReleaseEmailText(release, { baseUrl })

    return NextResponse.json({
      slug: release.slug,
      subject: getEmailSubject(release),
      previewText: getEmailPreviewText(release),
      html,
      text,
    })
  } catch (error) {
    console.error('Error rendering email:', error)
    return NextResponse.json(
      { error: 'Failed to render email' },
      { status: 500 },
    )
  }
}
