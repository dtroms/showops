import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ShowNotesPanel } from '@/components/show-detail/show-notes-panel'

export default async function ShowNotesPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const [{ data: show, error: showError }, { data: files, error: filesError }] =
    await Promise.all([
      supabase
        .from('shows')
        .select('id, show_name, internal_notes')
        .eq('id', showId)
        .maybeSingle(),

      supabase
        .from('show_files')
        .select('id, file_name, storage_path, mime_type, file_size, created_at')
        .eq('show_id', showId)
        .order('created_at', { ascending: false }),
    ])

  if (showError) throw new Error(showError.message)
  if (filesError) throw new Error(filesError.message)
  if (!show) notFound()

  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage
        .from('show-files')
        .createSignedUrl(file.storage_path, 60 * 60)

      return {
        ...file,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

  return (
    <ShowNotesPanel
      showId={showId}
      initialNotes={show.internal_notes ?? ''}
      files={filesWithUrls}
    />
  )
}