const STORAGE_KEY = 'cloudinary-uploads';
const MAX_ENTRIES = 50;

export interface LocalCloudinaryUpload {
  url: string;
  publicId: string;
  filename: string;
  uploadedAt: string;
}

/** Local, per-browser mirror of the server-side upload history — instant to read, no network round trip. */
export function getLocalCloudinaryUploads(): LocalCloudinaryUpload[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalCloudinaryUpload[]) : [];
  } catch (error) {
    console.error('Failed to read local Cloudinary upload history:', error);
    return [];
  }
}

export function recordCloudinaryUploadLocally(entry: LocalCloudinaryUpload): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const next = [entry, ...getLocalCloudinaryUploads()].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Failed to save Cloudinary upload locally:', error);
  }
}
