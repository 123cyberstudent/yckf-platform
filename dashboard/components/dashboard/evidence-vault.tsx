'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, File, Upload, Download, AlertCircle, Calendar, User } from 'lucide-react';

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

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        setLoading(true);
        setError(null);
        setUsingMockData(false);
        
        const response = await fetch('/api/evidence');
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            console.warn('Authentication required, using mock data');
            setUsingMockData(true);
          }
          throw new Error(`Failed to load evidence: ${response.status}`);
        }
        
        const data = await response.json();
        setEvidence(data);
      } catch (error) {
        console.error('Failed to fetch evidence:', error);
        setError('Failed to load evidence. Please try again later.');
        
        // Try to load from mock endpoint as fallback
        try {
          console.log('Attempting to fetch from mock endpoint...');
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
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
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
        <Button>
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
          {evidence.length === 0 
            ? 'No evidence found.' 
            : 'No evidence matches the current search.'}
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
                      <p className="font-medium truncate" title={item.filename}>
                        {item.filename}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.incidentTitle}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {formatFileSize(item.fileSize)}
                  </Badge>
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.fileType}
                    </Badge>
                    {item.chainOfCustody.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {item.chainOfCustody.length} audits
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="mr-2 size-3" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    View Chain
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}