'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidateShowFilePaths(showId: string) {
  revalidatePath(`/shows/${showId}/notes`)
  revalidatePath(`/shows/${showId}`)
}

export async function uploadShowFile(formData: FormData) {
  const showId = String(formData.get('showId') || '').trim()
  const file = formData.get('file') as File | null

  if (!showId || !file) {
    throw new Error('Show and file are required.')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('Organization not found for this user.')
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const safeName = file.name.replace(/\s+/g, '-')
  const storagePath = `${profile.organization_id}/${showId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('show-files')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: insertError } = await supabase
    .from('show_files')
    .insert({
      organization_id: profile.organization_id,
      show_id: showId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: profile.id,
    })

  if (insertError) {
    throw new Error(insertError.message)
  }

  revalidateShowFilePaths(showId)
}

export async function deleteShowFile(fileId: string, showId: string) {
  const supabase = await createClient()

  const { data: fileRow, error: fileError } = await supabase
    .from('show_files')
    .select('storage_path')
    .eq('id', fileId)
    .single()

  if (fileError || !fileRow) {
    throw new Error(fileError?.message || 'File not found.')
  }

  const { error: storageError } = await supabase.storage
    .from('show-files')
    .remove([fileRow.storage_path])

  if (storageError) {
    throw new Error(storageError.message)
  }

  const { error: deleteError } = await supabase
    .from('show_files')
    .delete()
    .eq('id', fileId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  revalidateShowFilePaths(showId)
}