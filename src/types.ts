export interface CBTFile {
  name: string;
  path: string;
  folder: string;
  data: ArrayBuffer;
  signature?: string;
  mimeType?: string;
}

export interface CBTArchive {
  modules: Map<string, CBTFile[]>; // Grouped by folder
  allFiles: Map<string, CBTFile>; // Full path to file
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}
