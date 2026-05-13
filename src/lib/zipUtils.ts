import JSZip from 'jszip';
import { CBTFile, CBTArchive } from '../types';

export async function extractCBTArchive(zipData: ArrayBuffer): Promise<CBTArchive> {
  const zip = await JSZip.loadAsync(zipData);
  const modules = new Map<string, CBTFile[]>();
  const allFiles = new Map<string, CBTFile>();

  const entries = Object.keys(zip.files);
  
  for (const name of entries) {
    const entry = zip.files[name];
    
    // Ignore directories and macOS junk
    if (entry.dir || name.includes('__MACOSX')) {
      continue;
    }

    const data = await entry.async('arraybuffer');
    
    const normalizedPath = name.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    const fileName = pathParts.pop() || normalizedPath;
    const folder = pathParts.join('/') || 'Root';

    const file: CBTFile = {
      name: fileName,
      path: normalizedPath,
      folder: folder === 'Root' ? '' : folder,
      data: data
    };

    // Add to virtual filesystem map - ONLY full paths to prevent cross-talk
    allFiles.set(normalizedPath, file);

    // Check if it's a SWF for the module selection list
    if (normalizedPath.toLowerCase().endsWith('.swf')) {
      const headerBytes = new Uint8Array(data.slice(0, 3));
      const signature = String.fromCharCode(...headerBytes);
      if (['FWS', 'CWS', 'ZWS'].includes(signature)) {
        file.signature = signature;
        
        if (!modules.has(folder)) {
          modules.set(folder, []);
        }
        modules.get(folder)!.push(file);
      }
    }
  }

  // Sort modules by name and files within modules by name
  const sortedModules = new Map<string, CBTFile[]>();
  const keys = Array.from(modules.keys()).sort();
  
  for (const key of keys) {
    const files = modules.get(key)!.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    sortedModules.set(key, files);
  }

  return {
    modules: sortedModules,
    allFiles
  };
}
