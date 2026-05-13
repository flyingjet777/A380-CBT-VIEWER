import React, { useEffect, useRef } from 'react';
import { CBTFile } from '../types';
import { HardDrive } from 'lucide-react';

interface CBTPlayerProps {
  file: CBTFile | null;
  allFiles: Map<string, CBTFile>;
}

declare global {
  interface Window {
    RufflePlayer: any;
  }
}

export const CBTPlayer = React.memo<CBTPlayerProps>(({ file, allFiles }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!file || !containerRef.current) return;

    // Intercept Fetch for Ruffle
    const originalFetch = window.fetch;
    const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // 1. Get the base path where the app is hosted (including the repo name on GitHub Pages)
      const originWithBase = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      
      let requestedPath = urlStr.replace(originWithBase, '');
      
      // Fallback: If it's still an absolute URL (e.g. requested using a different domain or absolute path from root)
      if (requestedPath.startsWith('http') || requestedPath.startsWith('//')) {
          requestedPath = urlStr.replace(window.location.origin, '').replace(/^\//, '');
      }

      // Remove any leading ./
      requestedPath = requestedPath.replace(/^\.\//, '').replace(/^\//, '');
      
      const fileName = requestedPath.split('/').pop() || '';
      const decodedFileName = decodeURIComponent(fileName);
      const decodedRequestedPath = decodeURIComponent(requestedPath);

      // 1. Try exact path match (if Ruffle provides a path starting from root)
      let matchedFile = allFiles.get(decodedRequestedPath);

      // 2. Try matching relative to the current SWF folder
      // This handles both absolute-looking paths (missing root folder) and relative ones
      if (!matchedFile && file.folder) {
          const relativePath = `${file.folder}/${decodedRequestedPath}`.replace(/\/+/g, '/');
          matchedFile = allFiles.get(relativePath);
          
          // Also try relative to the parent of the SWF if the SWF is deep in a folder
          if (!matchedFile) {
            const folderParts = file.folder.split('/');
            folderParts.pop();
            const parentFolder = folderParts.join('/');
            const parentRelativePath = parentFolder ? `${parentFolder}/${decodedRequestedPath}`.replace(/\/+/g, '/') : decodedRequestedPath;
            matchedFile = allFiles.get(parentRelativePath);
          }
      }

      // 3. Last ditch: If they are requesting just a filename, try to find it in the SAME folder as the host file
      if (!matchedFile && !decodedRequestedPath.includes('/')) {
          const localPath = file.folder ? `${file.folder}/${decodedRequestedPath}` : decodedRequestedPath;
          matchedFile = allFiles.get(localPath);
      }

      if (matchedFile) {
        console.log(`[VFS] Providing: ${matchedFile.path} for ${urlStr}`);
        const responseHeaders: Record<string, string> = {
            'Content-Type': matchedFile.name.endsWith('.swf') 
              ? 'application/x-shockwave-flash' 
              : matchedFile.name.endsWith('.png') || matchedFile.name.endsWith('.jpg')
              ? 'image/' + (matchedFile.name.endsWith('.png') ? 'png' : 'jpeg')
              : matchedFile.name.endsWith('.xml')
              ? 'text/xml'
              : 'application/octet-stream',
            'Content-Length': matchedFile.data.byteLength.toString(),
            'Cache-Control': 'no-cache'
        };

        return new Response(matchedFile.data, {
          status: 200,
          statusText: 'OK',
          headers: responseHeaders
        });
      }

      return originalFetch(input, init);
    };

    // Try multiple ways to override fetch safely
    try {
        // @ts-ignore
        window.fetch = interceptedFetch;
    } catch (e) {
        try {
            Object.defineProperty(window, 'fetch', {
                value: interceptedFetch,
                configurable: true,
                writable: true
            });
        } catch (e2) {
            console.error("Failed to override window.fetch. Virtual Filesystem may not work in this environment.", e2);
        }
    }

    // Clear previous player
    if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
    }

    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();
    
    containerRef.current.appendChild(player);
    playerRef.current = player;

    player.style.width = "100%";
    player.style.height = "100%";
    player.style.backgroundColor = "#000000";

    console.log(`Loading SWF: ${file.name} (Signature: ${file.signature}, Size: ${file.data.byteLength} bytes)`);

    player.load({
      data: file.data,
      allowScriptAccess: true,
      backgroundColor: "#000000",
      letterbox: "on",
      base_url: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)
    }).then(() => {
        console.log("Ruffle load successful");
    }).catch((err: any) => {
        console.error("Ruffle load error:", err);
    });

    return () => {
      // Restore fetch
      window.fetch = originalFetch;
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [file, allFiles]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-brand-text-dim rounded-none md:rounded-[2rem] bg-slate-100/50 px-10 text-center border-none">
        <HardDrive className="w-16 h-16 mb-6 opacity-20" />
        <p className="text-xl font-black uppercase tracking-[0.4em] text-brand-text-dim/40">Awaiting Module Data</p>
        <p className="text-xs mt-3 opacity-30 font-mono tracking-widest italic">READY_FOR_BOOT_INIT</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#121212] flex items-center justify-center overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

CBTPlayer.displayName = 'CBTPlayer';
