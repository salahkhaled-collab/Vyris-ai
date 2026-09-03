"use client";

import { useEffect, useRef, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { useUser } from "@/lib/user-context";
import { Upload, FileText, Download, Trash2, Building2 } from "lucide-react";

interface Doc {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  projectId: string | null;
  teamId: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { workspaceType } = useUser();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => setDocs(data.documents ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (shareWithTeam) formData.append("shareWithTeam", "true");

    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Upload failed.");
      } else {
        setDocs((prev) => [data, ...prev]);
      }
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteDoc(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  }

  return (
    <>
      <Topbar eyebrow="Intelligence" title="Documents" statusText={`${docs.length} files`} />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        <Panel className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm font-medium mb-1">Upload a document</div>
              <div className="text-xs text-muted">PDF, Word, images, up to 8MB.</div>
            </div>
            <div className="flex items-center gap-3">
              {workspaceType === "TEAM" && (
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareWithTeam}
                    onChange={(e) => setShareWithTeam(e.target.checked)}
                    className="accent-brass"
                  />
                  Share with team
                </label>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-60"
              >
                <Upload className="w-4 h-4" strokeWidth={2} />
                {uploading ? "Uploading..." : "Choose file"}
              </button>
            </div>
          </div>
          {error && <div className="text-xs text-signal/80 mt-3">{error}</div>}
        </Panel>

        {loading && <div className="text-sm text-muted py-8 text-center">Loading documents...</div>}

        {!loading && docs.length === 0 && (
          <Panel className="p-10 text-center">
            <FileText className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium mb-1">No documents yet</div>
            <div className="text-xs text-muted">Upload your first file to get started.</div>
          </Panel>
        )}

        {!loading && docs.length > 0 && (
          <Panel className="overflow-hidden">
            <div className="divide-y divide-line">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="shrink-0 rounded-lg p-2 bg-panel-2 text-muted">
                    <FileText className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.filename}</div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span>{formatSize(d.sizeBytes)}</span>
                      <span>·</span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      {d.teamId && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" strokeWidth={1.75} />
                            Team
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/documents/${d.id}`}
                    download={d.filename}
                    className="shrink-0 p-2 rounded-lg bg-panel-2 hover:bg-black/[0.06] transition-colors"
                    aria-label="Download"
                  >
                    <Download className="w-4 h-4" strokeWidth={1.75} />
                  </a>
                  <button
                    onClick={() => deleteDoc(d.id)}
                    className="shrink-0 text-muted hover:text-signal/80 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </main>
    </>
  );
}
