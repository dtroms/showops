'use client'

import { useState, useTransition } from 'react'
import { uploadShowFile, deleteShowFile } from '@/app/actions/show-files'
import { updateShowNotes } from '@/app/actions/shows'

type ShowFile = {
  id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  file_size: number | null
  created_at: string
  signedUrl: string | null
}

function isImage(mimeType: string | null) {
  return Boolean(mimeType?.startsWith('image/'))
}

function isPdf(mimeType: string | null) {
  return mimeType === 'application/pdf'
}

export function ShowNotesPanel({
  showId,
  initialNotes,
  files,
}: {
  showId: string
  initialNotes: string
  files: ShowFile[]
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [savingNotes, startSavingNotes] = useTransition()
  const [uploading, startUploading] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Show Notes</h2>
        <p className="mt-2 text-sm text-slate-600">
          Store internal notes, PDFs, images, drawings, and reference files for this show.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notes</h3>
          <button
            type="button"
            disabled={savingNotes}
            onClick={() =>
              startSavingNotes(async () => {
                setSaveMessage('')
                try {
                  await updateShowNotes(showId, notes)
                  setSaveMessage('Notes saved.')
                } catch (error) {
                  setSaveMessage(
                    error instanceof Error ? error.message : 'Failed to save notes.'
                  )
                }
              })
            }
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          className="w-full rounded-xl border px-4 py-3 text-sm"
          placeholder="Add show notes, logistics, reminders, reference info, and production notes..."
        />

        {saveMessage ? (
          <p className="mt-3 text-sm text-slate-600">{saveMessage}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">Files</h3>
        <p className="mt-1 text-sm text-slate-600">
          Upload images, PDFs, drawings, and other support files.
        </p>

        <form
          className="mt-4"
          action={(formData) =>
            startUploading(async () => {
              await uploadShowFile(formData)
            })
          }
        >
          <input type="hidden" name="showId" value={showId} />
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              name="file"
              className="rounded-lg border px-3 py-2 text-sm"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.dwg,.dxf,.zip"
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>

        {!files.length ? (
          <div className="mt-6 rounded-xl border border-dashed p-6 text-sm text-slate-500">
            No files uploaded yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {files.map((file) => (
              <div key={file.id} className="rounded-xl border bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{file.file_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {file.mime_type ?? 'Unknown file'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === file.id}
                    onClick={() => {
                      if (!confirm('Delete this file?')) return
                      setDeletingId(file.id)
                      startUploading(async () => {
                        await deleteShowFile(file.id, showId)
                        setDeletingId(null)
                      })
                    }}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                  >
                    Delete
                  </button>
                </div>

                {file.signedUrl && isImage(file.mime_type) ? (
                  <img
                    src={file.signedUrl}
                    alt={file.file_name}
                    className="mb-3 h-48 w-full rounded-lg border object-cover bg-white"
                  />
                ) : null}

                {file.signedUrl && isPdf(file.mime_type) ? (
                  <iframe
                    src={file.signedUrl}
                    title={file.file_name}
                    className="mb-3 h-64 w-full rounded-lg border bg-white"
                  />
                ) : null}

                {!isImage(file.mime_type) && !isPdf(file.mime_type) ? (
                  <div className="mb-3 rounded-lg border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                    Preview not available for this file type.
                  </div>
                ) : null}

                {file.signedUrl ? (
                  <a
                    href={file.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-slate-900 underline"
                  >
                    Open file
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">Preview unavailable.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}