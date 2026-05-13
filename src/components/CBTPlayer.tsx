import React, { useEffect, useRef } from 'react';
import { CBTFile } from '../types';
import { HardDrive, ChevronRight } from 'lucide-react';

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
      
      // Get the relative path Ruffle is asking for
      let requestedPath = urlStr.replace(window.location.origin, '').replace(/^\//, '');
      // Remove any leading ./
      requestedPath = requestedPath.replace(/^\.\//, '');
      
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
    player.style.touchAction = "none"; // Direct touch to Ruffle

    console.log(`Loading SWF: ${file.name} (Signature: ${file.signature}, Size: ${file.data.byteLength} bytes)`);

    player.load({
      data: file.data,
      allowScriptAccess: true,
      backgroundColor: "#000000",
      letterbox: "on",
      base_url: window.location.origin, // Ensure relative paths work
      unmuteOverlay: "hidden", // Prevent overlay blocking
      autoplay: "on",
      preloader: false,
      logLevel: "warn",
      warnOnInsecureContent: false,
    }).then(() => {
        console.log("Ruffle load successful");
        // Force focus to enable keyboard/touch navigation
        player.focus();
    }).catch((err: any) => {
        console.error("Ruffle load error:", err);
    });

    // Touch navigation helper for iPad/Touch devices
    const handleTouchStart = (e: TouchEvent) => {
      if (!playerRef.current) return;
      
      const touch = e.touches[0];
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const height = containerRef.current?.clientHeight || window.innerHeight;
      const x = touch.clientX;
      const y = touch.clientY;

      // Only handle if in the bottom-ish area where buttons usually are, or generally the sides
      // To avoid double-triggering when actually hitting an internal button, 
      // we only trigger if NOT hitting the bottom control bar area if we can guess it.
      // But user said "touch screen to navigate", so let's do sides.
      
      const isRightSide = x > width * 0.7;
      const isLeftSide = x < width * 0.3;
      
      if (isRightSide || isLeftSide) {
        // e.preventDefault(); // Don't prevent, so Flash gets the touch too for sound unlocking
        const direction = isRightSide ? 'next' : 'prev';
        handleNavigation(direction);
      }
    };

    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      // Restore fetch
      window.fetch = originalFetch;
      if (containerRef.current) {
        containerRef.current.removeEventListener('touchstart', handleTouchStart);
      }
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

  const handleNavigation = (direction: 'next' | 'prev') => {
    if (!playerRef.current) return;
    
    // Focus player first to ensure key events are received
    playerRef.current.focus();

    const key = direction === 'next' ? 'ArrowRight' : 'ArrowLeft';
    const altKey = direction === 'next' ? 'PageDown' : 'PageUp';

    // Dispatch both to cover different SWF navigation implementations
    [key, altKey].forEach(k => {
      const event = new KeyboardEvent('keydown', {
        key: k,
        code: k,
        bubbles: true,
        cancelable: true
      });
      playerRef.current.dispatchEvent(event);
    });
  };

  return (
    <div className="relative w-full h-full bg-[#121212] flex items-center justify-center overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

CBTPlayer.displayName = 'CBTPlayer';
