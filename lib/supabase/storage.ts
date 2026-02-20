import { createClient } from './client'

const BUCKET = 'readings'

/**
 * Upload a file to Supabase Storage.
 * Path convention: `{orderId}/{sectionId}/{filename}`
 */
export async function uploadReadingFile(
    orderId: string,
    sectionId: string,
    file: File
): Promise<{ url: string | null; error: string | null }> {
    const supabase = createClient()

    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const path = `${orderId}/${sectionId}/${timestamp}.${ext}`

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (error) {
        console.error('[Storage] Upload failed:', error.message)
        return { url: null, error: error.message }
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path)

    return { url: urlData.publicUrl, error: null }
}

/**
 * Upload a Blob (e.g. recorded audio) to Supabase Storage.
 */
export async function uploadReadingBlob(
    orderId: string,
    sectionId: string,
    blob: Blob,
    filename: string
): Promise<{ url: string | null; error: string | null }> {
    const file = new File([blob], filename, { type: blob.type })
    return uploadReadingFile(orderId, sectionId, file)
}

/**
 * Delete a file from Supabase Storage by its full path.
 */
export async function deleteReadingFile(path: string): Promise<boolean> {
    const supabase = createClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) {
        console.error('[Storage] Delete failed:', error.message)
        return false
    }
    return true
}
