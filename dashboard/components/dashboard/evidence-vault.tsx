'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Upload, Download, AlertCircle, Calendar, User, X } from 'lucide-react';
import { getRoleFromCookie } from '@/lib/permissions';

interface EvidenceItem {
  id: string;
  incidentId: string;
  incidentTitle: string;
  filename: string;
  fileType: string;
  fileSize: number;
  hash: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  description: string;
  chainOfCustody: Array<{
    id: string;
    action: string;
    performedBy: string;
    performedByName: string;
    timestamp: string;
    details: string;
  }>;
}

export function EvidenceVault() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [search, setSearch] = useState('');
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadReportId, setUploadReportId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chainOpen, setChainOpen] = useState(false);
  const [chainItem, setChainItem] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    getRoleFromCookie().then(setCurrentRole);
  }, []);

  const canPerformActions = currentRole === 'admin';

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingMockData(false);

      const response = await fetch('/api/evidence');

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          setUsingMockData(true);
        }
        throw new Error(`Failed to load evidence: ${response.status}`);
      }

      const data = await response.json();
      setEvidence(data);
    } catch (error) {
      console.error('Failed to fetch evidence:', error);
      setError('Failed to load evidence. Please try again later.');

      try {
        const mockResponse = await fetch('/api/evidence/mock');
        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          setEvidence(mockData);
          setUsingMockData(true);
        }
      } catch (mockError) {
        console.error('Failed to load mock evidence:', mockError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    if (fileType.includes('exe')) return '⚙️';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('pcap')) return '🌐';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredEvidence = evidence.filter(item => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${item.filename} ${item.incidentTitle} ${item.description} ${item.uploadedByName}`
      .toLowerCase()
      .includes(query);
  });

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file');
      return;
    }
    const reportId = parseInt(uploadReportId, 10);
    if (isNaN(reportId) || reportId <= 0) {
      setUploadError('Please enter a valid incident/case ID');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('reportId', String(reportId));
      formData.append('description', uploadDescription.trim());

      const response = await fetch('/api/evidence', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Upload failed (${response.status})`);
      }

      setUploadOpen(false);
      setUploadFile(null);
      setUploadReportId('');
      setUploadDescription('');
      await fetchEvidence();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (item: EvidenceItem) => {
    window.open(`/api/evidence/dl?id=${item.id}`, '_blank');
  };

  const handleViewChain = (item: EvidenceItem) => {
    setChainItem(item);
    setChainOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Evidence Vault</h2>
            <p className="text-muted-foreground">Manage digital evidence and chain of custody</p>
          </div>
          <Button disabled>
            <Upload className="mr-2 size-4" />
            Upload Evidence
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          Loading evidence...
        </div>
      </div>
    );
  }

  if (error && evidence.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Evidence Vault</h2>
            <p className="text-muted-foreground">Manage digital evidence and chain of custody</p>
          </div>
          <Button disabled>
            <Upload className="mr-2 size-4" />
            Upload Evidence
          </Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto size-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evidence Vault</h2>
          <p className="text-muted-foreground">Manage digital evidence and chain of custody</p>
        </div>
        <Button onClick={() => { setUploadError(''); setUploadOpen(true); }} className={currentRole && currentRole !== 'admin' ? 'hidden' : ''}>
          <Upload className="mr-2 size-4" />
          Upload Evidence
        </Button>
      </div>

      {usingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="size-4 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-700">
            Using demo evidence data - Backend connection unavailable
          </p>
        </div>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search evidence by filename, incident, or uploader"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredEvidence.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-10 text-center text-muted-foreground">
          {evidence.length === 0 ? 'No evidence found.' : 'No evidence matches the current search.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvidence.map((item) => (
            <Card key={item.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getFileIcon(item.fileType)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" title={item.filename}>{item.filename}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.incidentTitle}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">{formatFileSize(item.fileSize)}</Badge>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="size-3" />
                    <span>{item.uploadedByName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>{new Date(item.uploadedAt).toLocaleString()}</span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">{item.fileType}</Badge>
                    {item.chainOfCustody.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{item.chainOfCustody.length} audits</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(item)}>
                    <Download className="mr-2 size-3" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewChain(item)}>
                    View Chain
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !uploading && setUploadOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upload Evidence</h2>
              <button onClick={() => !uploading && setUploadOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
                {uploadFile && (
                  <p className="mt-1 text-xs text-muted-foreground">{uploadFile.name} ({formatFileSize(uploadFile.size)})</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Incident/Case ID *</label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  value={uploadReportId}
                  onChange={(e) => setUploadReportId(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the evidence"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={uploading}
                />
              </div>
              {uploadError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{uploadError}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {chainOpen && chainItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setChainOpen(false)} />
          <div className="relative z-50 w-full max-w-xl max-h-[80vh] overflow-auto rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Chain of Custody</h2>
                <p className="text-sm text-muted-foreground">{chainItem.filename}</p>
              </div>
              <button onClick={() => setChainOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            {chainItem.chainOfCustody.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/50 p-6 text-center text-muted-foreground">
                No custody records available for this item.
              </div>
            ) : (
              <div className="relative ml-3 border-l-2 border-border pl-6 space-y-6">
                {chainItem.chainOfCustody.map((entry, idx) => (
                  <div key={entry.id} className="relative">
                    <div className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-primary bg-background" />
                    <div className="rounded-md border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{entry.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">By: {entry.performedByName}</p>
                      {entry.details && (
                        <p className="text-sm mt-2 text-muted-foreground">{entry.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
