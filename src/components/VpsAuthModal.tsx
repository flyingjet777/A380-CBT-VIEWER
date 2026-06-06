import React, { useState, useEffect } from 'react';
import { X, Terminal, FileArchive, Play, Lock, Wifi } from 'lucide-react';

interface RemoteFile {
  name: string;
  url: string;
}

interface VpsAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (url: string, authHeader: string) => void;
  serverUrl: string;
}

export function VpsAuthModal({ isOpen, onClose, onFileSelect, serverUrl }: VpsAuthModalProps) {
  const [username, setUsername] = useState(localStorage.getItem('vps_username') || '');
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authHeader, setAuthHeader] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedAuth = localStorage.getItem('vps_auth_header');
      if (savedAuth) {
        setAuthHeader(savedAuth);
        connectWithHeader(savedAuth);
      }
    }
  }, [isOpen]);

  const connectWithHeader = async (header: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${serverUrl}/index.json`, {
        headers: { 'Authorization': header }
      });

      if (response.status === 401) {
        localStorage.removeItem('vps_auth_header');
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setIsConnected(false);
        return;
      }

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      const sorted = Array.isArray(data)
        ? data.sort((a: RemoteFile, b: RemoteFile) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          )
        : data;

      setFiles(sorted);
      setIsConnected(true);
    } catch (err) {
      setError('서버 연결 실패. CORS 또는 네트워크 오류입니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    const header = 'Basic ' + btoa(unescape(encodeURIComponent(`${username}:${password}`)));
    setAuthHeader(header);
    await connectWithHeader(header);
    localStorage.setItem('vps_username', username);
    localStorage.setItem('vps_auth_header', header);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setFiles([]);
    setPassword('');
    setAuthHeader('');
    localStorage.removeItem('vps_auth_header');
  };

  const handleFileSelect = (url: string) => {
    onFileSelect(url, authHeader);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[80vh]">

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center">
              <Terminal className="w-6 h-6 text-brand-accent" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-[0.2em] uppercase text-brand-text">IMPORT_REMOTE</h2>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase italic">SECURE_ARCHIVE_STREAMER</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isConnected ? (
            <div className="flex flex-col gap-4">
              {/* Server info */}
              <div className="p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/20">
                <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest mb-1">Connected Server</p>
                <p className="text-[11px] font-bold text-slate-600">{serverUrl}</p>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">아이디 (Username)</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="Username"
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">비밀번호 (Password)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && username && password && handleConnect()}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-accent transition-colors"
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-500">{error}</p>
                </div>
              )}

              {/* Connect button */}
              <button
                onClick={handleConnect}
                disabled={isLoading || !username || !password}
                className="w-full py-3 bg-brand-accent hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-accent/20"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {isLoading ? 'CONNECTING...' : 'CONNECT'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Connected header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">{files.length} ARCHIVES FOUND</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-[9px] font-black text-slate-400 hover:text-red-400 uppercase tracking-widest transition-colors"
                >
                  DISCONNECT
                </button>
              </div>

              {/* File list */}
              {files.map((file, i) => (
                <button
                  key={i}
                  onClick={() => handleFileSelect(file.url)}
                  className="w-full text-left p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 hover:border-brand-accent transition-all group flex items-center gap-4 active:scale-98"
                >
                  <div className="w-10 h-10 bg-brand-accent/5 rounded-xl flex items-center justify-center group-hover:bg-brand-accent/10 transition-colors shrink-0">
                    <FileArchive className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-slate-700 truncate uppercase tracking-tight">{file.name}</p>
                  </div>
                  <Play className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-brand-accent transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ENCRYPTED_SESSION_ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
