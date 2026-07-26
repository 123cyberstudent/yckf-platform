export async function logExport(exportType: string, format: 'csv' | 'pdf', recordCount: number, filters?: string) {
  try {
    await fetch('/api/audit/export-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportType, format, recordCount, filters }),
    });
  } catch {
    // Silent fail — don't block the export
  }
}
