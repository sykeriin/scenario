/**
 * Minimal stand-in for Supabase Storage.
 *
 * Files are turned into data URLs, so the resulting "public URL" can be saved
 * straight into a row (e.g. profiles.avatar_url) and survives reloads without
 * any server. The in-memory map only bridges upload() -> getPublicUrl().
 *
 * Trade-off: large images bloat IndexedDB rows. Downscale before upload if
 * that becomes a problem.
 */
const uploaded = new Map<string, string>();

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function storageFrom(bucket: string) {
  const key = (path: string) => `${bucket}/${path}`;
  return {
    async upload(path: string, file: Blob, _opts?: { upsert?: boolean; contentType?: string }) {
      try {
        uploaded.set(key(path), await fileToDataUrl(file));
        return { data: { path }, error: null };
      } catch (e: unknown) {
        return { data: null, error: { message: e instanceof Error ? e.message : 'Upload failed' } };
      }
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: uploaded.get(key(path)) ?? '' } };
    },
  };
}

export const localStorageApi = { from: storageFrom };
