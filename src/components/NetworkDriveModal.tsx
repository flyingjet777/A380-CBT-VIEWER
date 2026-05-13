import React, { useState, useEffect } from 'react';
import { Cloud, Search, FileArchive, X, Download, AlertCircle, Loader2, Check } from 'lucide-react';
import { getAccessToken, listZipFiles, downloadFile, DriveFile, clearCachedToken } from '../lib/drive';

interface NetworkDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (fileData: ArrayBuffer, fileName: string) => void;
}

export const NetworkDriveModal: React.FC<NetworkDriveModalProps> = ({ isOpen, onClose, onFileSelect }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const handleResetAuth = () => {
    clearCachedToken();
    loadFiles(true);
  };

  const loadFiles = async (interactive = false) => {
    setIsLoading(true);
    setError(null);
    try {
      let token: string | null = null;
      
      // Try silent first, then interactive if requested
      try {
        if (interactive) {
          token = await getAccessToken(true);
        } else {
          // Try to get token quietly
          token = await getAccessToken(false).catch(() => null);
        }
      } catch (e) {
        console.warn('Authentication skipped for listing, falling back to API Key if available');
      }

      // If no token AND no API Key, listZipFiles will try with API Key if configured
      const zipFiles = await listZipFiles(token, 'AIRBUS_CBT');
      setFiles(zipFiles);
      setNeedsAuth(false);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'interaction_required' || err.message === 'popup_blocked') {
        setNeedsAuth(true);
      } else {
        setError(err.message || '파일 목록을 불러오는 데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles(false);
    }
  }, [isOpen]);

  const handleSelectFile = async (file: DriveFile) => {
    setIsStreaming(file.id);
    try {
      // Try with current session/API Key first
      let token: string | null = null;
      try {
        token = await getAccessToken(false).catch(() => null);
      } catch (e) {}

      const data = await downloadFile(file.id, token);
      onFileSelect(data, file.name);
      onClose();
    } catch (err: any) {
      setError('보안 연결 실패: ' + err.message);
      // If failed, we likely need explicit authorization
      if (err.message.includes('authorize')) {
        setNeedsAuth(true);
      }
    } finally {
      setIsStreaming(null);
    }
  };

  const filteredFiles = [...files]
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Natural sort: compare numbers within strings
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-brand-text/20 backdrop-blur-sm"
      />
      
      <div 
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-brand-border overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center">
              <Cloud className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-widest uppercase">Network_Drive_Uplink</h3>
              <p className="text-[10px] text-brand-text-dim font-bold font-mono tracking-tighter uppercase italic">Secure_Archive_Streamer</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-brand-text-dim"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          {/* Search Bar */}
          <div className="p-6 pb-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
              <input 
                type="text" 
                placeholder="SEARCHING ARCHIVES..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-brand-border rounded-2xl px-4 py-3.5 pl-11 text-xs focus:outline-none focus:border-brand-accent transition-all placeholder:text-brand-text-dim/60 font-bold tracking-wider" 
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {needsAuth ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 bg-brand-accent/5 rounded-full flex items-center justify-center animate-pulse">
                  <Cloud className="w-8 h-8 text-brand-accent" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black tracking-widest uppercase">Authorization Required</p>
                  <p className="text-[10px] text-brand-text-dim font-medium max-w-[240px] leading-relaxed">
                    Access permissions are needed to scan your Google Drive for CBT archives.
                  </p>
                </div>
                <button 
                  onClick={() => loadFiles(true)}
                  className="px-8 py-3 bg-brand-accent text-white rounded-2xl text-[11px] font-black tracking-[0.2em] shadow-xl shadow-brand-accent/20 hover:scale-105 active:scale-95 transition-all"
                >
                  AUTHORIZE_ACCESS
                </button>
              </div>
            ) : isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-4 opacity-50">
                <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                <p className="text-[10px] font-black tracking-[0.4em] uppercase animate-pulse">Synchronizing_VFS_Nodes</p>
              </div>
            ) : error ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-10 space-y-4">
                <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                <p className="text-[10px] font-bold font-mono text-red-600 uppercase">{error}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => loadFiles(true)}
                    className="text-[10px] font-black text-brand-accent hover:underline uppercase tracking-widest px-4 py-2 border border-brand-accent/20 rounded-xl"
                  >
                    Retry_Handshake
                  </button>
                  <button 
                    onClick={handleResetAuth}
                    className="text-[10px] font-black text-brand-text-dim hover:text-brand-text uppercase tracking-widest px-4 py-2"
                  >
                    Reset_Connection
                  </button>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-10 space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                  <FileArchive className="w-8 h-8 text-brand-text-dim opacity-30" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-brand-text">No CBT Archives Found</p>
                  <p className="text-[10px] text-brand-text-dim font-medium max-w-[280px] leading-relaxed">
                    드라이브에 <span className="text-brand-accent font-black">AIRBUS_CBT</span> 라는 이름의 폴더를 만드시고, 그 안에 교육용 ZIP 파일들을 보관해 주세요.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => loadFiles(true)}
                    className="text-[11px] font-black text-brand-accent hover:underline uppercase tracking-widest mt-2 px-6 py-2 bg-brand-accent/5 rounded-xl"
                  >
                    Refresh_Library
                  </button>
                  <button 
                    onClick={handleResetAuth}
                    className="text-[9px] font-black text-brand-text-dim hover:text-brand-text uppercase tracking-widest opacity-60"
                  >
                    RE-AUTHORIZE_STORAGE_LINK
                  </button>
                </div>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  disabled={isStreaming !== null}
                  className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-white border border-transparent hover:border-brand-accent/30 rounded-2xl transition-all group active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 bg-brand-accent/5 rounded-xl flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-all">
                      <FileArchive className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-brand-text truncate group-hover:text-brand-accent transition-colors">{file.name}</h4>
                      <p className="text-[9px] text-brand-text-dim font-bold tracking-tighter uppercase truncate opacity-70">EXTERNAL_CLOUD_NODE // SECURE_VLOG</p>
                    </div>
                  </div>
                  <div className="flex items-center text-brand-accent">
                    {isStreaming === file.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-brand-border flex items-center justify-center">
             <div className="flex items-center gap-2 opacity-30">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
               <span className="text-[9px] font-mono font-black tracking-widest uppercase">Encrypted_Session_Active</span>
             </div>
          </div>
      </div>
    </div>
  );
};
