'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidateShowFilePaths(showId: string) {
  revalidatePath(`/shows/${showId}/notes`)
  revalidatePath(`/shows/${showId}`)
  revalidatePath('/dashboard')
}

function cleanFileName(fileName: string) {
  return fileName
    .replace(/[^\w.\-() ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 140)
}

export async function uploadShowFile(formData: FormData) {
  const showId = String(formData.get('showId') || '').trim()
  const file = formData.get('file') as File | null

  if (!showId) {
    throw new Error('Show ID is required.')
  }

  if (!file || file.size === 0) {
    throw new Error('File is required.')
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error(userError?.message || 'You must be logged in.')
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_memberships')
    .select('id, organization_id, profile_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    throw new Error(membershipError?.message || 'Organization membership not found.')
  }

  const safeName = cleanFileName(file.name)
  const storagePath = `${membership.organization_id}/${showId}/${Date.now()}-${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('show-files')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: insertError } = await supabase.from('show_files').insert({
    organization_id: membership.organization_id,
    show_id: showId,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    uploaded_by: membership.profile_id,
    uploaded_by_membership_id: membership.id,
  })

  if (insertError) {
    await supabase.storage.from('show-files').remove([storagePath])
    throw new Error(insertError.message)
  }

  revalidateShowFilePaths(showId)
}

export async function deleteShowFile(fileId: string, showId: string) {
  if (!fileId) {
    throw new Error('File ID is required.')
  }

  if (!showId) {
    throw new Error('Show ID is required.')
  }

  const supabase = await createClient()

  const { data: fileRow, error: fileError } = await supabase
    .from('show_files')
    .select('id, storage_path')
    .eq('id', fileId)
    .eq('show_id', showId)
    .maybeSingle()

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
    .eq('show_id', showId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  revalidateShowFilePaths(showId)
}

export async function updateShowNotes(showId: string, notes: string) {
  if (!showId) {
    throw new Error('Show ID is required.')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('shows')
    .update({
      internal_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', showId)

  if (error) {
    throw new Error(error.message)
  }

  revalidateShowFilePaths(showId)
}