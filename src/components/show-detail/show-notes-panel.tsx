'use client'

import { useRef, useState, useTransition } from 'react'
import {
  uploadShowFile,
  deleteShowFile,
  updateShowNotes,
} from '@/app/actions/show-files'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageSection } from '@/components/ui/page-section'

type ShowFile = {
  id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  file_size: number | null
  created_at: string | null
  signedUrl?: string | null
}

type Props = {
  showId: string
  showName?: string
  initialNotes?: string
  files?: ShowFile[]
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getFileType(file: ShowFile) {
  const name = file.file_name.toLowerCase()

  if (file.mime_type?.startsWith('image/')) return 'Image'
  if (file.mime_type === 'application/pdf') return 'PDF'
  if (file.mime_type?.includes('zip') || name.endsWith('.zip')) return 'ZIP'
  if (name.endsWith('.dwg')) return 'DWG'
  if (name.endsWith('.dxf')) return 'DXF'

  return file.mime_type || 'File'
}

function getFileIcon(file: ShowFile) {
  const name = file.file_name.toLowerCase()

  if (file.mime_type?.startsWith('image/')) return '🖼️'
  if (file.mime_type === 'application/pdf') return '📕'
  if (file.mime_type?.includes('zip') || name.endsWith('.zip')) return '🗜️'
  if (name.endsWith('.dwg') || name.endsWith('.dxf')) return '📐'

  return '📄'
}

function canPreview(file: ShowFile) {
  return Boolean(
    file.signedUrl &&
      (file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf')
  )
}

export function ShowNotesPanel({
  showId,
  initialNotes = '',
  files = [],
}: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<ShowFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [savePending, startSaveTransition] = useTransition()
  const [uploadPending, startUploadTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  return (
    <div className="space-y-6">
      <PageSection title="Show Notes">
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={10}
            placeholder="Add show notes, logistics, reminders, reference info, and production notes..."
            className="min-h-[220px] w-full rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{saveMessage}</p>

            <Button
              disabled={savePending}
              onClick={() => {
                setSaveMessage('')

                startSaveTransition(async () => {
                  try {
                    await updateShowNotes(showId, notes)
                    setSaveMessage('Notes saved.')
                  } catch (error) {
                    setSaveMessage(
                      error instanceof Error ? error.message : 'Failed to save notes.'
                    )
                  }
                })
              }}
            >
              {savePending ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Files"
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return

                startUploadTransition(async () => {
                  const formData = new FormData()
                  formData.set('showId', showId)
                  formData.set('file', file)

                  await uploadShowFile(formData)

                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                })
              }}
            />

            <Button
              variant="secondary"
              disabled={uploadPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadPending ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        }
      >
        {!files.length ? (
          <EmptyState
            title="No files uploaded"
            description="Upload drawings, PDFs, images, ZIP files, and show documents here."
          />
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_90px] border-b border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <div>Name</div>
              <div>Type</div>
              <div>Uploaded</div>
              <div className="text-right">Size</div>
            </div>

            <div className="divide-y divide-white/10">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_120px_120px_90px] items-center px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.05]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-lg">{getFileIcon(file)}</span>
                    <span className="truncate font-medium text-white">{file.file_name}</span>
                  </div>

                  <div className="truncate text-slate-400">{getFileType(file)}</div>
                  <div className="truncate text-slate-400">{formatDate(file.created_at)}</div>
                  <div className="text-right text-slate-400">
                    {formatFileSize(file.file_size)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </PageSection>

      {selectedFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">
                  {getFileIcon(selectedFile)} {selectedFile.file_name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getFileType(selectedFile)} · {formatFileSize(selectedFile.file_size)} ·{' '}
                  {formatDate(selectedFile.created_at)}
                </p>
              </div>

              <Button variant="secondary" onClick={() => setSelectedFile(null)}>
                Close
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-black/30 p-4">
              {canPreview(selectedFile) && selectedFile.mime_type?.startsWith('image/') ? (
                <img
                  src={selectedFile.signedUrl!}
                  alt={selectedFile.file_name}
                  className="mx-auto max-h-[70vh] rounded-2xl border border-white/10 bg-white/[0.03] object-contain"
                />
              ) : null}

              {canPreview(selectedFile) && selectedFile.mime_type === 'application/pdf' ? (
                <iframe
                  src={selectedFile.signedUrl!}
                  title={selectedFile.file_name}
                  className="h-[70vh] w-full rounded-2xl border border-white/10 bg-white"
                />
              ) : null}

              {!canPreview(selectedFile) ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <div className="text-5xl">{getFileIcon(selectedFile)}</div>
                  <p className="mt-4 font-semibold text-white">Preview not available</p>
                  <p className="mt-1 text-sm text-slate-500">
                    This file type can still be opened in a new tab.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
{selectedFile.signedUrl ? (
  <div className="flex flex-wrap gap-2">
    <a
      href={selectedFile.signedUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      Open in New Tab
    </a>

    <a
      href={selectedFile.signedUrl}
      download={selectedFile.file_name}
      className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      Download
    </a>
  </div>
) : (
  <span className="text-sm text-slate-500">File unavailable</span>
)}

              <Button
                variant="destructive"
                disabled={deletePending}
                onClick={() => {
                  if (!confirm('Delete this file?')) return

                  startDeleteTransition(async () => {
                    await deleteShowFile(selectedFile.id, showId)
                    setSelectedFile(null)
                  })
                }}
              >
                {deletePending ? 'Deleting...' : 'Delete File'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}