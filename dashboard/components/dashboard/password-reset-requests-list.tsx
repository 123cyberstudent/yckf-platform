'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  KeyRound,
  Loader2,
  Mail,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

interface MatchedUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

interface HandledBy {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface ResetRequest {
  id: number;
  requestNumber: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  reason?: string | null;
  status: RequestStatus;
  action?: 'reset_link' | 'temp_password' | null;
  adminNote?: string | null;
  handledAt?: string | null;
  createdAt: string;
  matchedUser?: MatchedUser | null;
  handledBy?: HandledBy | null;
}

interface SearchableUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/30',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PasswordResetRequestsList() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | RequestStatus>('pending');

  const [handleTarget, setHandleTarget] = useState<ResetRequest | null>(null);
  const [handleLoading, setHandleLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [action, setAction] = useState<'reset_link' | 'temp_password' | 'reject'>('reset_link');
  const [note, setNote] = useState('');

  const [result, setResult] = useState<{
    message: string;
    temporaryPassword?: string;
    resetLink?: string;
    maskedEmail?: string;
  } | null>(null);

  const loadRequests = useCallback(async (status: 'all' | RequestStatus) => {
    setLoading(true);
    setError(null);
    try {
      const query = status === 'all' ? '' : `?status=${status}`;
      const response = await fetch(`/api/auth/staff/reset-requests${query}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Failed to load requests')
        setRequests([])
        return
      }
      setRequests(Array.isArray(payload?.requests) ? payload.requests : [])
    } catch {
      setError('Could not reach the backend. Please try again.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests(filter)
  }, [filter, loadRequests])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchTouched(true)
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchQuery.trim())}`)
      const payload = await response.json().catch(() => null)
      if (Array.isArray(payload)) {
        setSearchResults(payload)
      } else if (Array.isArray(payload?.users)) {
        setSearchResults(payload.users)
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
      toast.error('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  function openHandleDialog(request: ResetRequest) {
    setHandleTarget(request)
    setSearchQuery('')
    setSearchResults([])
    setSearchTouched(false)
    setSelectedUserId(null)
    setAction('reset_link')
    setNote('')
    setResult(null)
  }

  async function handleSubmit() {
    if (!handleTarget) return

    if (action !== 'reject' && selectedUserId === null) {
      toast.error('Select the matching account for this request.')
      return
    }

    setHandleLoading(true)
    try {
      const response = await fetch(`/api/auth/staff/reset-requests/${handleTarget.id}/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: action === 'reject' ? undefined : selectedUserId,
          note: note.trim() || undefined,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(payload?.error || 'Failed to handle request.')
        return
      }

      if (payload?.temporaryPassword) {
        setResult({
          message: payload.message || 'Temporary password generated.',
          temporaryPassword: payload.temporaryPassword,
          maskedEmail: payload.maskedEmail,
        })
      } else if (payload?.resetLink && !payload.emailed) {
        setResult({
          message: payload.message || 'Reset link generated but email delivery failed. Share it securely.',
          resetLink: payload.resetLink,
          maskedEmail: payload.maskedEmail,
        })
      } else {
        setResult({ message: payload?.message || 'Request handled successfully.' })
      }

      setHandleTarget(null)
      loadRequests(filter)
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setHandleLoading(false)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy. Copy it manually.')
    }
  }

  const selectedUser = searchResults.find((u) => u.id === selectedUserId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['pending', 'all', 'approved', 'completed', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            type="button"
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-red-600">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading requests...
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {filter === 'pending'
              ? 'No pending requests. New requests from staff will appear here.'
              : 'No requests found.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {request.requestNumber}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-foreground">{request.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{request.role || 'Role not stated'}</p>
                  </div>
                  <Badge className={STATUS_STYLES[request.status]}>
                    {STATUS_LABELS[request.status]}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Mail className="size-3.5 shrink-0" />
                    {request.email || 'Email not provided'}
                  </p>
                  {request.phone && (
                    <p className="flex items-center gap-2">
                      <span className="inline-block size-3.5 shrink-0 text-center text-xs">☎</span>
                      {request.phone}
                    </p>
                  )}
                  <p>Submitted {formatDate(request.createdAt)}</p>
                </div>

                {request.reason && (
                  <p className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground/80">
                    {request.reason}
                  </p>
                )}

                {request.matchedUser && (
                  <p className="flex items-center gap-2 text-sm text-foreground/80">
                    <UserCheck className="size-3.5 shrink-0 text-emerald-600" />
                    Matched: {request.matchedUser.fullName} ({request.matchedUser.email})
                  </p>
                )}

                {request.adminNote && (
                  <p className="text-sm text-muted-foreground">Admin note: {request.adminNote}</p>
                )}

                {request.status !== 'pending' && (
                  <p className="text-xs text-muted-foreground">
                    {request.status === 'approved' && request.action === 'reset_link'
                      ? 'Reset link sent'
                      : request.status === 'approved' && request.action === 'temp_password'
                        ? 'Temporary password generated'
                        : request.status === 'completed'
                          ? 'New password set by account holder'
                          : 'Request rejected'}
                    {request.handledBy ? ` by ${request.handledBy.fullName}` : ''} ·{' '}
                    {formatDate(request.handledAt)}
                  </p>
                )}

                {request.status === 'pending' && (
                  <Button
                    type="button"
                    variant="default"
                    className="w-full"
                    onClick={() => openHandleDialog(request)}
                  >
                    <KeyRound className="mr-2 size-4" />
                    Handle Request
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Handle dialog */}
      <Dialog
        open={!!handleTarget}
        onOpenChange={(open) => {
          if (!open && !handleLoading) setHandleTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Handle {handleTarget?.requestNumber}</DialogTitle>
            <DialogDescription>
              {handleTarget?.fullName}
              {handleTarget?.email ? ` · ${handleTarget.email}` : ''}
              {handleTarget?.role ? ` · ${handleTarget.role}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Find the matching account
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                  }}
                />
                <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  <span className="sr-only">Search</span>
                </Button>
              </div>

              {searchTouched && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No accounts match &quot;{searchQuery}&quot;. Try their exact email or full name.
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selectedUserId === user.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border/60 bg-background/50 hover:bg-accent'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{user.role}</Badge>
                        {user.status === 'suspended' && <XCircle className="size-4 text-red-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <p className="mt-2 text-sm text-emerald-600">
                  Selected: {selectedUser.name} ({selectedUser.email})
                  {selectedUser.status === 'suspended' && ' — this account is suspended'}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Action</label>
              <div className="space-y-2">
                {[
                  {
                    value: 'reset_link' as const,
                    label: 'Send reset link',
                    description: 'Emails a secure one-time link the staff member clicks to set a new password.',
                  },
                  {
                    value: 'temp_password' as const,
                    label: 'Generate temporary password',
                    description: 'Sets a temporary password and emails it. The staff member logs in and changes it.',
                  },
                  {
                    value: 'reject' as const,
                    label: 'Reject request',
                    description: 'No account changes. Add a note explaining why.',
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      action === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-border/60 bg-background/50 hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="handle-action"
                      className="mt-1"
                      checked={action === option.value}
                      onChange={() => setAction(option.value)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-foreground">
                Note <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="note"
                rows={2}
                placeholder="Internal note for this decision"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHandleTarget(null)}
              disabled={handleLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={handleLoading}
              className={action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {handleLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Processing...
                </>
              ) : action === 'reject' ? (
                'Reject Request'
              ) : action === 'reset_link' ? (
                'Send Reset Link'
              ) : (
                'Generate Temporary Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={!!result} onOpenChange={(open) => { if (!open) setResult(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request handled</DialogTitle>
            <DialogDescription>{result?.message}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {result?.temporaryPassword && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Temporary password{result.maskedEmail ? ` (emailed to ${result.maskedEmail})` : ''}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
                  <code className="flex-1 break-all font-mono text-sm text-foreground">
                    {result.temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(result.temporaryPassword!)}
                  >
                    <ClipboardCopy className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-amber-600">
                  Share it securely with the staff member if the email did not deliver. It is shown
                  only once. They must change it after logging in.
                </p>
              </div>
            )}

            {result?.resetLink && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">Reset link (copy to relay)</p>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
                  <code className="flex-1 break-all text-xs text-foreground">{result.resetLink}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(result.resetLink!)}
                  >
                    <ClipboardCopy className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-amber-600">This link expires in 24 hours and can only be used once.</p>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              <CheckCircle2 className="size-4 shrink-0" />
              The request has been updated.
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
