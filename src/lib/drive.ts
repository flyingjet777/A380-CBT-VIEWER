import firebaseConfig from '../../firebase-applet-config.json';

let tokenClient: any = null;
let authInitialized = false;

// Memory-based caching
let cachedAccessToken: string | null = null;
let tokenExpiryTime: number | null = null; // Timestamp in ms

export const initAuth = () => {
  if (authInitialized) return;

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  if (!clientId) {
    return;
  }

  const googleObj = (window as any).google;
  if (!googleObj || !googleObj.accounts || !googleObj.accounts.oauth2) {
    // If google object is not ready, we can't initialize yet.
    // getAccessToken will try to call initAuth again.
    return;
  }

  try {
    tokenClient = googleObj.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.error !== undefined) {
          console.error('GSI Auth Error:', response);
          return;
        }
        cachedAccessToken = response.access_token;
        const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
        tokenExpiryTime = Date.now() + expiresIn * 1000;
        
        // Dispatch event for components to know auth succeeded
        window.dispatchEvent(new CustomEvent('google-auth-success', { detail: { token: response.access_token } }));
      },
    });
    authInitialized = true;
  } catch (e) {
    console.error('Failed to initialize Google Auth Client:', e);
  }
};

export const getAccessToken = async (interactive = false): Promise<string> => {
  if (!tokenClient) {
    initAuth();
    if (!tokenClient) throw new Error('Auth not initialized. Please ensure Google Client ID is configured.');
  }

  if (cachedAccessToken && tokenExpiryTime && (tokenExpiryTime - Date.now() > 60000)) {
    return cachedAccessToken;
  }

  return new Promise((resolve, reject) => {
    // Timeout to prevent hanging if Google callback fails
    const timeoutId = setTimeout(() => {
      reject(new Error('AUTH_TIMEOUT: Authentication session timed out. Please try again with Authorize button.'));
    }, 60000);

    // We override the callback temporarily for this specific request
    const originalCallback = tokenClient.callback;
    
    tokenClient.callback = (response: any) => {
      clearTimeout(timeoutId);
      tokenClient.callback = originalCallback; // Restore
      
      if (response.error !== undefined) {
        console.error('Drive Auth Error:', response.error);
        if (response.error === 'immediate_failed' || response.error === 'interaction_required') {
          reject(new Error('interaction_required'));
        } else {
          reject(new Error(response.error_description || response.error));
        }
      } else {
        cachedAccessToken = response.access_token;
        const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
        tokenExpiryTime = Date.now() + expiresIn * 1000;
        resolve(response.access_token);
      }
    };

    try {
      if (interactive) {
          tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
          // 'none' or empty prompt for silent refresh if possible
          tokenClient.requestAccessToken({ prompt: '' });
      }
    } catch (e) {
      clearTimeout(timeoutId);
      reject(e);
    }
  });
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
  tokenExpiryTime = null;
};

const GOOGLE_API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY as string) || '';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export const listZipFiles = async (token: string | null, folderName?: string): Promise<DriveFile[]> => {
  // Support multiple common ZIP mime types
  const zipMimeTypes = [
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream" // Sometimes ZIPs are generic binary
  ];
  const mimeQuery = zipMimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  let query = `(${mimeQuery}) and trashed=false`;
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If folderName is provided, find the folder ID first
  if (folderName) {
    try {
      const folderUrl = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and trashed=false&fields=files(id, name, mimeType)${GOOGLE_API_KEY && !token ? `&key=${GOOGLE_API_KEY}` : ''}`;
      const folderResponse = await fetch(folderUrl, { headers });
      const folderData = await folderResponse.json();
      
      const foundFolder = folderData.files?.find((f: any) => 
        f.mimeType === 'application/vnd.google-apps.folder' || 
        f.mimeType === 'application/vnd.google-apps.shortcut'
      );

      if (foundFolder) {
        const folderId = foundFolder.id;
        console.log(`[Drive] Targeting folder: ${folderName} (${folderId})`);
        query += ` and '${folderId}' in parents`;
      } else {
        console.warn(`[Drive] Folder '${folderName}' not found. Searching globally...`);
      }
    } catch (e) {
      console.error('[Drive] Error searching for folder:', e);
    }
  }

  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType)&pageSize=100${GOOGLE_API_KEY && !token ? `&key=${GOOGLE_API_KEY}` : ''}`;
  
  const response = await fetch(listUrl, { headers });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[Drive] Files API Error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to list files from Google Drive');
  }

  const data = await response.json();
  
  return (data.files || []).filter((f: any) => {
    if (f.mimeType === 'application/octet-stream') {
      return f.name.toLowerCase().endsWith('.zip');
    }
    return true;
  });
};

export const downloadFile = async (fileId: string, token: string | null): Promise<ArrayBuffer> => {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${GOOGLE_API_KEY && !token ? `&key=${GOOGLE_API_KEY}` : ''}`;

  const response = await fetch(downloadUrl, { headers });

  if (!response.ok) {
    throw new Error('Failed to download file from Google Drive. If the file is private, please authorize first.');
  }

  return await response.arrayBuffer();
};
