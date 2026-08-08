import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const YCKF_BLUE = '#2563EB'
const YCKF_DARK = '#06292D'

interface PDFColumn {
  header: string
  key: string
  width?: number
}

interface PDFExportOptions {
  title: string
  subtitle?: string
  columns: PDFColumn[]
  rows: Array<Record<string, unknown>>
  fileName: string
  summary?: { label: string; value: string | number }[]
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(YCKF_DARK)
  doc.rect(0, 0, 210, 35, 'F')

  doc.setFillColor(YCKF_BLUE)
  doc.rect(0, 35, 210, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('YOUNG CYBER KNIGHTS FOUNDATION', 105, 14, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 105, 23, { align: 'center' })

  if (subtitle) {
    doc.setFontSize(8)
    doc.text(subtitle, 105, 30, { align: 'center' })
  }

  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 205, 30, { align: 'right' })
}

function addFooter(doc: jsPDF, pageCount: number) {
  const height = doc.internal.pageSize.height
  doc.setFillColor(YCKF_DARK)
  doc.rect(0, height - 12, 210, 12, 'F')

  doc.setFontSize(7)
  doc.setTextColor(180, 180, 180)
  doc.text('Young Cyber Knights Foundation | Confidential Report', 10, height - 5)
  doc.text(`Page ${pageCount}`, 200, height - 5, { align: 'right' })
}

export function generatePDFReport(options: PDFExportOptions) {
  const { title, subtitle, columns, rows, fileName, summary } = options
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  addHeader(doc, title, subtitle)

  let yPos = 42

  if (summary && summary.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Summary', 14, yPos)
    yPos += 6

    const summaryColWidth = 180 / summary.length
    summary.forEach((item, i) => {
      const x = 14 + i * summaryColWidth
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(x, yPos - 4, summaryColWidth - 2, 16, 2, 2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(YCKF_BLUE)
      doc.text(String(item.value), x + (summaryColWidth - 2) / 2, yPos + 3, { align: 'center' })

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(item.label, x + (summaryColWidth - 2) / 2, yPos + 9, { align: 'center' })
    })

    yPos += 22
  }

  if (rows.length > 0) {
    const head = [columns.map((c) => c.header)]
    const body = rows.map((row) =>
      columns.map((c) => {
        const val = row[c.key]
        if (val === null || val === undefined) return '-'
        if (val instanceof Date) return val.toLocaleDateString()
        return String(val)
      })
    )

    autoTable(doc, {
      startY: yPos,
      head,
      body,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 3,
        overflow: 'ellipsize',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: YCKF_BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [245, 248, 255],
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        addFooter(doc, doc.getNumberOfPages())
      },
    })
  } else {
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text('No data available', 105, yPos + 10, { align: 'center' })
  }

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`${fileName}.pdf`)
}

export function generatePlatformReport(data: {
  totalCases?: number
  openCases?: number
  pendingCases?: number
  resolvedCases?: number
  closedCases?: number
  totalUsers?: number
  activeUsers?: number
  totalEvidence?: number
  totalIncidents?: number
  criticalIncidents?: number
  caseClosureRate?: number
  averageResolutionTime?: string
  recentActivity?: unknown[]
  monthlyData?: Array<{ month?: string; incidents?: number; resolved?: number; critical?: number }>
  categoryData?: Array<{ name?: string; category?: string; value?: number | string; count?: number | string }>
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  addHeader(doc, 'PLATFORM ACTIVITY REPORT', 'Comprehensive overview of system activities and metrics')

  let yPos = 45

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Case Statistics', 14, yPos)
  yPos += 8

  const caseStats = [
    ['Total Cases', String(data.totalCases ?? data.totalIncidents ?? 0)],
    ['Open Cases', String(data.openCases ?? 0)],
    ['Pending Cases', String(data.pendingCases ?? 0)],
    ['Resolved Cases', String(data.resolvedCases ?? 0)],
    ['Closed Cases', String(data.closedCases ?? 0)],
    ['Critical Incidents', String(data.criticalIncidents ?? 0)],
    ['Case Closure Rate', `${data.caseClosureRate ?? 0}%`],
    ['Avg. Resolution Time', data.averageResolutionTime ?? 'N/A'],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: caseStats,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: 14, right: 14 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
    didDrawPage: () => addFooter(doc, doc.getNumberOfPages()),
  })

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('User Statistics', 14, yPos)
  yPos += 8

  const userStats = [
    ['Total Users', String(data.totalUsers ?? 0)],
    ['Active Users', String(data.activeUsers ?? data.totalUsers ?? 0)],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: userStats,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: 14, right: 14 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
    didDrawPage: () => addFooter(doc, doc.getNumberOfPages()),
  })

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12

  if (data.totalEvidence !== undefined) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Evidence Statistics', 14, yPos)
    yPos += 8

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [['Total Evidence Items', String(data.totalEvidence)]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
      didDrawPage: () => addFooter(doc, doc.getNumberOfPages()),
    })
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
  }

  if (data.categoryData && data.categoryData.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Cases by Category', 14, yPos)
    yPos += 8

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Count']],
      body: data.categoryData.map((c) => [c.name || c.category || '-', String(c.value || c.count || 0)]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { left: 14, right: 14 },
      didDrawPage: () => addFooter(doc, doc.getNumberOfPages()),
    })
    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
  }

  if (data.monthlyData && data.monthlyData.length > 0) {
    const remainingSpace = doc.internal.pageSize.height - yPos - 20
    if (remainingSpace > 30) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Monthly Trends', 14, yPos)
      yPos += 8

      autoTable(doc, {
        startY: yPos,
        head: [['Month', 'Incidents', 'Resolved', 'Critical']],
        body: data.monthlyData.map((m) => [
          m.month || '-',
          String(m.incidents ?? 0),
          String(m.resolved ?? 0),
          String(m.critical ?? 0),
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        margin: { left: 14, right: 14 },
        didDrawPage: () => addFooter(doc, doc.getNumberOfPages()),
      })
    }
  }

  addFooter(doc, doc.getNumberOfPages())
  doc.save('yckf-platform-report.pdf')
}
