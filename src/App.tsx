import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileArchive, ChevronRight, HardDrive, Info, Play, Cloud, Search, Maximize2, Terminal, Cpu, LogIn, User, X } from 'lucide-react';
import { extractCBTArchive } from './lib/zipUtils.ts';
import { CBTFile, CBTArchive } from './types.ts';
import { CBTPlayer } from './components/CBTPlayer.tsx';
import { NetworkDriveModal } from './components/NetworkDriveModal';
import { initAuth } from './lib/drive';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';

const EMPTY_MAP = new Map();

export default function App() {
  const [archive, setArchive] = useState<CBTArchive | null>(null);
  const [selectedFile, setSelectedFile] = useState<CBTFile | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const handleZipUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError(null);
    addLog(`INIT_PROCEDURE: Starting extraction for ${file.name}`);
    try {
      const buffer = await file.arrayBuffer();
      const extractedArchive = await extractCBTArchive(buffer);
      
      const firstModuleKey = Array.from(extractedArchive.modules.keys())[0];
      const firstFile = firstModuleKey ? extractedArchive.modules.get(firstModuleKey)?.[0] : null;

      if (!firstFile) {
        throw new Error("ARCHIVE_ERROR: No valid SWF training segments detected.");
      }
      
      setArchive(extractedArchive);
      setSelectedFile(firstFile);
      
      let totalSwfs = 0;
      extractedArchive.modules.forEach(files => totalSwfs += files.length);
      
      addLog(`STATUS_OK: Synced ${totalSwfs} segments across ${extractedArchive.modules.size} modules // VFS size ${extractedArchive.allFiles.size}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive extraction failed");
      addLog(`FATAL_EXCEPTION: Parsing failed.`);
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  }, [addLog]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      addLog('AUTH_ERROR: Google Uplink Failed');
    }
  };

  const copyShareLink = () => {
    const shareUrl = "https://ais-pre-uk6ec5ot7z3ldr3a3gwwlo-498619116093.asia-northeast1.run.app";
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLogs(prev => [`[SYSTEM] Share link copied: ${shareUrl}`, ...prev].slice(0, 50));
    });
  };

  const handleDriveFileSelect = async (fileData: ArrayBuffer, fileName: string) => {
    setIsExtracting(true);
    addLog(`INIT_PROCEDURE: Starting Drive extraction for ${fileName}`);
    try {
      const extractedArchive = await extractCBTArchive(fileData);
      
      const firstModuleKey = Array.from(extractedArchive.modules.keys())[0];
      const firstFile = firstModuleKey ? extractedArchive.modules.get(firstModuleKey)?.[0] : null;

      if (!firstFile) {
        throw new Error("ARCHIVE_ERROR: No valid SWF training segments detected.");
      }
      
      setArchive(extractedArchive);
      setSelectedFile(firstFile);

      let totalSwfs = 0;
      extractedArchive.modules.forEach(files => totalSwfs += files.length);
      
      addLog(`STATUS_OK: Synced ${totalSwfs} segments across ${extractedArchive.modules.size} modules // Drive Uplink Active`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive extraction failed");
      addLog(`FATAL_EXCEPTION: Drive Parsing failed.`);
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Filter and Sort Logic for Module Library
  const filteredFiles = React.useMemo(() => {
    if (!archive) return [];
    
    const allSwfs: CBTFile[] = [];
    archive.modules.forEach((files) => {
      allSwfs.push(...files);
    });

    return allSwfs.filter(f => {
      const nameMatch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const folderLower = (f.folder || "").toLowerCase();
      const nameLower = f.name.toLowerCase();
      
      const isExcluded = (nameLower.includes("slide") || nameLower.includes("sound") || folderLower.includes("slide") || folderLower.includes("sound")) && 
                         !searchQuery;
                         
      return nameMatch && !isExcluded;
    }).sort((a, b) => {
      if (a.folder !== b.folder) return a.folder.localeCompare(b.folder);
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [archive, searchQuery]);

  const allFiles = React.useMemo(() => archive?.allFiles || EMPTY_MAP, [archive]);

  // Handle iPad auto-collapse on selection
  useEffect(() => {
    if (selectedFile && window.innerWidth < 1280) {
      setIsSidebarOpen(false);
    }
  }, [selectedFile]);

  return (
    <div className={`h-screen flex flex-col bg-brand-bg text-brand-text font-sans overflow-hidden antialiased ${isFullscreen ? 'bg-black' : ''}`}>
      {/* Flight Control / Global Status Bar */}
      {!isFullscreen && (
        <header className="h-12 md:h-14 bg-brand-surface border-b border-brand-border flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-xl">
          <div className="flex items-center gap-3 md:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 md:p-2.5 hover:bg-slate-100 rounded-xl border border-transparent hover:border-brand-border text-brand-accent group active:scale-95 transition-all"
              title={isSidebarOpen ? "Collapse Flight Deck" : "Open Flight Deck"}
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-accent/10 border border-brand-accent/20 rounded-xl flex items-center justify-center shadow-sm">
                <Play className="w-4 h-4 md:w-5 md:h-5 text-brand-accent fill-brand-accent" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[9px] md:text-[11px] font-black tracking-[0.2em] md:tracking-[0.4em] text-brand-text uppercase leading-none truncate">AIRBUS CBT EMULATOR</h1>
                <div className="flex items-center gap-2 mt-1 md:mt-2">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                  <p className="text-[7px] md:text-[9px] text-brand-text-dim font-bold font-mono tracking-widest uppercase truncate">
                    A380 OP TRAINING TEAM / SUNGWOOK CHO
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-8">
             <div className="hidden xl:flex flex-col items-end gap-1 font-mono text-[9px] font-black tracking-tighter opacity-70">
                <span className="text-brand-text-dim">EMULATION_CORE_STABLE</span>
                <span className="text-green-500">UPLINK_ENCRYPTED_256</span>
             </div>
             
             <div className="hidden md:block w-px h-8 bg-brand-border"></div>

             <button
              onClick={() => setIsDriveModalOpen(true)}
              className="px-3 md:px-5 py-2 md:py-2.5 bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/40 rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-brand-accent flex items-center gap-2 md:gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-accent/5"
            >
              <Cloud className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden xs:inline">NETWORK_DRIVE</span>
              <span className="xs:hidden">DRIVE</span>
            </button>

            <button 
              onClick={handleGoogleLogin}
              className={`p-2 md:p-2.5 rounded-xl border flex items-center justify-center gap-2 md:gap-3 transition-all ${
                user 
                ? 'border-green-500/30 bg-green-50/50 text-green-700' 
                : 'border-brand-border bg-slate-100 hover:bg-slate-200 text-brand-text'
              }`}
              title={user ? `Operator: ${user.email}` : "Sync with Command Center"}
            >
              {user ? <User className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden sm:inline">{user ? 'ONLINE' : 'AUTH'}</span>
            </button>
          </div>
        </header>
      )}

      <NetworkDriveModal 
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onFileSelect={handleDriveFileSelect}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar: Flight Deck / Module Library */}
        {isSidebarOpen && !isFullscreen && (
          <aside className="w-[300px] md:w-[340px] bg-brand-sidebar border-r border-brand-border flex flex-col shrink-0 z-20 shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
            <div className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] md:text-[12px] font-black text-brand-text-dim tracking-[0.3em] uppercase italic">Module Library</span>
                  <span className="text-[9px] md:text-[10px] font-mono font-bold px-2 py-0.5 bg-brand-accent/10 text-brand-accent rounded border border-brand-accent/20">
                    {filteredFiles.length} Segments
                  </span>
               </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto px-2 space-y-2 custom-scrollbar pb-10 scroll-smooth overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {filteredFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 px-10 text-center grayscale py-20">
                  <FileArchive className="w-12 md:w-16 h-12 md:h-16 mb-6 text-brand-text-dim" />
                  <p className="text-[10px] md:text-xs font-black tracking-[0.5em] uppercase leading-loose">Awaiting Archive <br/> Insertion</p>
                </div>
              ) : (
                  filteredFiles.map((swf, i) => (
                  <button
                    key={swf.path}
                    onClick={() => setSelectedFile(swf)}
                    className={`w-full text-left p-3 md:p-4 rounded-2xl border-2 cursor-pointer group mb-2 relative overflow-hidden transition-all ${
                      selectedFile?.path === swf.path 
                      ? 'bg-white border-brand-accent shadow-lg z-10' 
                      : 'bg-transparent border-transparent hover:bg-white hover:border-brand-border'
                    }`}
                  >
                    {selectedFile?.path === swf.path && (
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-accent"></div>
                    )}
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <span className={`text-[12px] md:text-[14px] font-black truncate leading-tight tracking-tight pr-4 ${selectedFile?.path === swf.path ? 'text-brand-accent' : 'text-brand-text'}`}>
                        {swf.name.replace('.swf', '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] md:text-[9px] font-black font-mono text-brand-text-dim uppercase tracking-tighter">SEG_{String(i + 1).padStart(3, '0')}</div>
                      <p className="text-[9px] md:text-[10px] text-brand-text-muted/70 truncate font-bold italic tracking-wider uppercase opacity-50">{swf.folder ? swf.folder.split('/').pop() : 'ROOT'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="h-16 md:h-20 px-4 md:px-6 bg-brand-sidebar flex items-center shrink-0">
              <label className="w-full py-2 md:py-2.5 bg-brand-accent hover:bg-orange-600 text-white rounded-xl text-[9px] md:text-[10px] font-black tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-brand-accent/10 active:scale-95 group relative overflow-hidden transition-all">
                <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
                IMPORT_LOCAL
                <input type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
              </label>
            </div>
          </aside>
        )}

        {/* Main Content: Training Viewport */}
        <main className={`flex-1 flex flex-col bg-brand-bg relative min-w-0 ${isFullscreen ? 'z-[100] fixed inset-0' : ''}`}>
           {/* Focus Rail */}
          {!isFullscreen && (
            <div className="h-8 md:h-10 bg-brand-sidebar/30 flex items-center justify-between px-4 md:px-6 border-b border-brand-border shrink-0">
              <div className="flex items-center gap-3 md:gap-5 text-[8px] md:text-[10px] font-mono font-black italic truncate pr-4">
                <span className="text-brand-accent tracking-[0.2em] md:tracking-[0.3em] uppercase shrink-0">STATUS:</span>
                <span className="text-brand-text uppercase truncate transition-colors">
                  {selectedFile ? selectedFile.name : 'AWAITING_INPUT'}
                </span>
                <div className="hidden sm:block w-px h-3 bg-brand-border mx-1 shrink-0"></div>
                <span className="hidden sm:inline text-brand-text-dim uppercase tracking-tighter shrink-0">EMU_READY @ 60HZ</span>
              </div>
              
              <button 
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black text-brand-text-dim hover:text-brand-accent transition-all uppercase tracking-[0.1em] md:tracking-[0.2em] group shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:scale-110" />
                <span className="hidden xs:inline">FULL_VIEW</span>
              </button>
            </div>
          )}

          {/* Ruffle Container - Maximized Viewport */}
          <div className={`flex-1 relative flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-0 md:p-2'} bg-[#0a0a0a] overflow-hidden`}>
            <div 
              id="ruffle-viewport"
              className={`w-full h-full max-w-full max-h-full bg-black border-none overflow-hidden relative group flex items-center justify-center ${!isFullscreen ? 'md:border md:border-white/5 rounded-none md:rounded-[2rem] shadow-2xl' : ''}`}
            >
              <div className="w-full h-full flex items-center justify-center relative">
                <CBTPlayer file={selectedFile} allFiles={allFiles} />
              </div>
              
              {isFullscreen && (
                <button 
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white z-[110] transition-all active:scale-95 group"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
              )}
              
              {/* Augmented Presence HUD - Refined for minimalism */}
              {selectedFile && (
                <div className="absolute top-4 left-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex flex-col gap-1">
                    <div className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-md border border-white/5 flex flex-col gap-1">
                      <span className="text-[8px] font-mono text-brand-accent font-black tracking-widest uppercase">UPLINK_LIVE</span>
                      <div className="flex gap-0.5 h-0.5">
                         {[...Array(3)].map((_, i) => (
                           <div 
                             key={i} 
                             className="w-1.5 h-full bg-brand-accent/30"
                           ></div>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-md border border-white/5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-brand-text-dim uppercase tracking-tighter">EMULATOR</span>
                    <span className="text-[10px] font-black text-brand-text uppercase italic tracking-tighter leading-none">VFS_SYNC</span>
                  </div>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                </div>
              )}
            </div>
          </div>

          {/* Instructor Feedback Terminal */}
          {!isFullscreen && (
            <footer className="h-14 md:h-16 bg-brand-sidebar border-t border-brand-border px-4 md:px-6 flex items-center gap-6 md:gap-12 z-20 overflow-hidden shrink-0">
              <div className="flex flex-col min-w-[200px] md:min-w-[280px]">
                <span className="text-[8px] md:text-[9px] text-brand-accent font-black tracking-[0.3em] md:tracking-[0.5em] mb-0.5 uppercase italic opacity-80">Telemetry_Bus</span>
                <div className="flex gap-6 md:gap-10">
                  <div className="flex flex-col">
                    <span className="text-[7px] md:text-[8px] text-brand-text-dim font-black uppercase tracking-widest mb-0.5">SIG_STAMP</span>
                    <span className="text-[10px] md:text-[12px] font-mono font-black text-brand-text tracking-[0.1em]">{selectedFile ? selectedFile.signature : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] md:text-[8px] text-brand-text-dim font-black uppercase tracking-widest mb-0.5">VFS_NODES</span>
                    <span className="text-[10px] md:text-[12px] font-mono font-black text-brand-text tracking-[0.1em]">
                      {archive ? String(archive.allFiles.size).padStart(5, '0') : '00000'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="h-8 md:h-10 w-px bg-brand-border shrink-0"></div>
              
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-[8px] md:text-[9px] text-brand-accent font-black tracking-[0.3em] md:tracking-[0.5em] mb-0.5 uppercase italic opacity-80">Buffer_Pipeline</span>
                <div className="bg-white border border-brand-border rounded-lg md:rounded-xl p-2 md:p-2.5 h-8 md:h-10 font-mono text-[8px] md:text-[9px] text-brand-text-muted flex flex-col overflow-y-auto custom-scrollbar shadow-inner overscroll-contain">
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div key={i} className="flex gap-3 md:gap-4 mb-0.5 last:mb-0 items-start hover:bg-slate-50 px-2 rounded">
                        <span className="text-brand-accent font-black opacity-60 min-w-[60px] md:min-w-[80px]">+{i}s</span>
                        <span className="font-bold opacity-90 tracking-tight leading-none truncate">{log}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-4 font-black text-brand-accent/40 h-full">
                       <span className="text-brand-accent tracking-[0.2em] md:tracking-[0.5em] text-[8px] md:text-[10px]">AWAITING_INPUT_STREAM</span>
                    </div>
                  )}
                </div>
              </div>
            </footer>
          )}
        </main>
      </div>

      {isExtracting && (
        <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center text-brand-text">
          <div className="relative w-80 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-10">
             <div className="absolute inset-0 bg-brand-accent/10"></div>
            <div className="h-full bg-brand-accent shadow-[0_0_20px_#f97316] relative w-1/3"></div>
          </div>
          <h2 className="text-xs font-black tracking-[0.6em] uppercase italic text-brand-text">
             Synchronizing Virtual Cockpit
          </h2>
          <p className="text-brand-text-dim mt-5 font-mono text-[9px] font-bold tracking-[0.4em] uppercase">
             Mapping memory buffers // Initializing Ruffle layer
          </p>
        </div>
      )}

      {error && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[250] w-[500px] bg-red-950/30 border-2 border-red-500/40 text-red-100 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl p-8 flex flex-col gap-6 ring-1 ring-white/10">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                 <Info className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex flex-col">
                <p className="font-black text-xs uppercase tracking-[0.4em] text-red-400 mb-1">Critical Fault Detected</p>
                <p className="text-[13px] font-bold font-mono leading-relaxed opacity-90">{error}</p>
              </div>
           </div>
          <button 
            onClick={() => setError(null)} 
            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] transition-all active:scale-95 shadow-xl"
          >
            Clear_Fault_Log
          </button>
        </div>
      )}
    </div>
  );
}
