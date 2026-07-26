import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE = '#2563EB'
const DARK = '#06292D'
const TEAL = '#2DD4BF'
const WHITE = '#FFFFFF'
const LIGHT_GRAY = '#F8FAFC'
const MED_GRAY = '#94A3B8'

interface PlatformReportData {
  generatedAt: string
  period: string
  organisation: {
    name: string
    mission: string
    founder: string
  }
  users: {
    total: number
    mobile: number
    web: number
    active: number
    volunteers: number
    investigators: number
    admins: number
    newLast30Days: number
  }
  incidents: {
    total: number
    open: number
    investigating: number
    pendingEvidence: number
    resolved: number
    closed: number
    critical: number
    caseClosureRate: number
    avgResponseTimeHours: string
    newLast30Days: number
  }
  emergencyReports: {
    total: number
    pending: number
    resolved: number
  }
  bookings: {
    total: number
    pending: number
    confirmed: number
    completed: number
  }
  enquiries: {
    total: number
    new: number
    open: number
    resolved: number
  }
  evidence: {
    total: number
  }
  cases: {
    total: number
    active: number
  }
}

function drawPage1_CoverAndSummary(doc: jsPDF, data: PlatformReportData) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  doc.setFillColor(DARK)
  doc.rect(0, 0, w, h, 'F')

  doc.setFillColor(BLUE)
  doc.rect(0, 0, w, 4, 'F')
  doc.rect(0, h - 4, w, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(32)
  doc.setTextColor(WHITE)
  doc.text('YOUNG CYBER KNIGHTS', w / 2, 35, { align: 'center' })
  doc.text('FOUNDATION', w / 2, 48, { align: 'center' })

  doc.setFillColor(BLUE)
  doc.roundedRect(60, 56, w - 120, 1.5, 1, 1, 'F')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEAL)
  doc.text('Platform Activity Report', w / 2, 68, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(180, 200, 220)
  doc.text('Comprehensive Overview of System Activities & Impact Metrics', w / 2, 78, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(MED_GRAY)
  const genDate = new Date(data.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Report Generated: ${genDate}`, w / 2, 90, { align: 'center' })
  doc.text('CONFIDENTIAL', w / 2, 97, { align: 'center' })

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(20, 108, w - 40, 1, 1, 1, 'F')

  let y = 120
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(WHITE)
  doc.text('Executive Summary', 30, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 215, 230)
  const missionLines = doc.splitTextToSize(data.organisation.mission, w - 60)
  doc.text(missionLines, 30, y)
  y += missionLines.length * 5 + 8

  const stats = [
    { label: 'Total Users', value: data.users.total, color: BLUE },
    { label: 'Active Volunteers', value: data.users.volunteers, color: TEAL },
    { label: 'Incidents Reported', value: data.incidents.total, color: '#F59E0B' },
    { label: 'Cases Resolved', value: data.incidents.resolved + data.incidents.closed, color: '#10B981' },
    { label: 'Emergency Reports', value: data.emergencyReports.total, color: '#EF4444' },
    { label: 'Bookings Made', value: data.bookings.total, color: '#8B5CF6' },
    { label: 'Enquiries Received', value: data.enquiries.total, color: '#EC4899' },
    { label: 'Evidence Items', value: data.evidence.total, color: '#06B6D4' },
  ]

  const cardW = (w - 70) / 4
  const cardH = 28
  stats.forEach((stat, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = 25 + col * (cardW + 7)
    const cy = y + row * (cardH + 8)

    doc.setFillColor(30, 50, 70)
    doc.roundedRect(x, cy, cardW, cardH, 3, 3, 'F')

    doc.setFillColor(stat.color)
    doc.roundedRect(x, cy, cardW, 2.5, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(WHITE)
    doc.text(String(stat.value), x + cardW / 2, cy + 15, { align: 'center' })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 180, 200)
    doc.text(stat.label, x + cardW / 2, cy + 22, { align: 'center' })
  })

  y += 2 * (cardH + 8) + 12

  doc.setFillColor(30, 50, 70)
  doc.roundedRect(25, y, w - 50, 18, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(TEAL)
  doc.text(`Case Closure Rate: ${data.incidents.caseClosureRate}%`, w / 2 - 50, y + 7)
  doc.setTextColor(WHITE)
  doc.text(`Avg Response Time: ${data.incidents.avgResponseTimeHours} hrs`, w / 2 + 40, y + 7)
  doc.setTextColor(180, 200, 220)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`New Users (30 days): ${data.users.newLast30Days}  |  New Incidents (30 days): ${data.incidents.newLast30Days}  |  Founded by: ${data.organisation.founder}`, w / 2, y + 14, { align: 'center' })

  doc.setFontSize(6)
  doc.setTextColor(MED_GRAY)
  doc.text('Young Cyber Knights Foundation | Confidential Report', w / 2, h - 10, { align: 'center' })
  doc.text('Page 1 of 2', w - 20, h - 10, { align: 'right' })
}

function drawPage2_DetailedBreakdown(doc: jsPDF, data: PlatformReportData) {
  doc.addPage()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.height

  doc.setFillColor(BLUE)
  doc.rect(0, 0, w, 28, 'F')
  doc.setFillColor(DARK)
  doc.rect(0, 28, w, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(WHITE)
  doc.text('Detailed Platform Breakdown', 20, 18)

  doc.setFontSize(8)
  doc.setTextColor(180, 200, 220)
  doc.text(`Report Date: ${new Date(data.generatedAt).toLocaleDateString('en-GB')}`, w - 20, 18, { align: 'right' })

  let y = 38

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('User Demographics', 20, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Count', 'Details']],
    body: [
      ['Total Registered Users', String(data.users.total), `Mobile: ${data.users.mobile} | Web: ${data.users.web}`],
      ['Active Users', String(data.users.active), `${Math.round((data.users.active / Math.max(data.users.total, 1)) * 100)}% of total`],
      ['Volunteers', String(data.users.volunteers), 'Trained cybersecurity volunteers'],
      ['Investigators', String(data.users.investigators), 'Active case investigators'],
      ['Administrators', String(data.users.admins), 'System administrators'],
      ['New Users (Last 30 Days)', String(data.users.newLast30Days), 'Recent platform growth'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, font: 'helvetica', textColor: [30, 30, 30] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: 20, right: 20 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 }, 1: { halign: 'center', cellWidth: 30 } },
    didDrawPage: () => {
      doc.setFillColor(DARK)
      doc.rect(0, h - 12, w, 12, 'F')
      doc.setFontSize(6)
      doc.setTextColor(MED_GRAY)
      doc.text('Young Cyber Knights Foundation | Confidential Report', 20, h - 5)
      doc.text(`Page ${doc.getNumberOfPages()} of 2`, w - 20, h - 5, { align: 'right' })
    },
  })

  y = (doc as any).lastAutoTable.finalY + 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Incident Management', 20, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Count', 'Status']],
    body: [
      ['Total Incidents Reported', String(data.incidents.total), 'All-time reported cases'],
      ['Open Cases', String(data.incidents.open), 'Awaiting assignment'],
      ['Under Investigation', String(data.incidents.investigating), 'Active investigation'],
      ['Pending Evidence', String(data.incidents.pendingEvidence), 'Awaiting evidence submission'],
      ['Resolved Cases', String(data.incidents.resolved), 'Successfully resolved'],
      ['Closed Cases', String(data.incidents.closed), 'Archived cases'],
      ['Critical Incidents', String(data.incidents.critical), 'High-severity cases'],
      ['Case Closure Rate', `${data.incidents.caseClosureRate}%`, 'Resolution efficiency'],
      ['Avg Response Time', `${data.incidents.avgResponseTimeHours} hrs`, 'Time to first response'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, font: 'helvetica', textColor: [30, 30, 30] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    margin: { left: 20, right: 20 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 }, 1: { halign: 'center', cellWidth: 30 } },
    didDrawPage: () => {
      doc.setFillColor(DARK)
      doc.rect(0, h - 12, w, 12, 'F')
      doc.setFontSize(6)
      doc.setTextColor(MED_GRAY)
      doc.text('Young Cyber Knights Foundation | Confidential Report', 20, h - 5)
      doc.text(`Page ${doc.getNumberOfPages()} of 2`, w - 20, h - 5, { align: 'right' })
    },
  })

  y = (doc as any).lastAutoTable.finalY + 12

  const remainingSpace = h - y - 20
  if (remainingSpace > 80) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text('Additional Services', 20, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Service', 'Total', 'Active/Pending', 'Resolved/Completed']],
      body: [
        [
          'Emergency Reports',
          String(data.emergencyReports.total),
          String(data.emergencyReports.pending),
          String(data.emergencyReports.resolved),
        ],
        [
          'Session Bookings',
          String(data.bookings.total),
          String(data.bookings.pending + data.bookings.confirmed),
          String(data.bookings.completed),
        ],
        [
          'Enquiries',
          String(data.enquiries.total),
          String(data.enquiries.new + data.enquiries.open),
          String(data.enquiries.resolved),
        ],
        [
          'Evidence Items',
          String(data.evidence.total),
          '-',
          '-',
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4, font: 'helvetica', textColor: [30, 30, 30] },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { left: 20, right: 20 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'center', cellWidth: 30 }, 2: { halign: 'center', cellWidth: 40 }, 3: { halign: 'center', cellWidth: 40 } },
      didDrawPage: () => {
        doc.setFillColor(DARK)
        doc.rect(0, h - 12, w, 12, 'F')
        doc.setFontSize(6)
        doc.setTextColor(MED_GRAY)
        doc.text('Young Cyber Knights Foundation | Confidential Report', 20, h - 5)
        doc.text(`Page ${doc.getNumberOfPages()} of 2`, w - 20, h - 5, { align: 'right' })
      },
    })
  }

  doc.setFillColor(DARK)
  doc.rect(0, h - 12, w, 12, 'F')
  doc.setFontSize(6)
  doc.setTextColor(MED_GRAY)
  doc.text('Young Cyber Knights Foundation | Confidential Report', 20, h - 5)
  doc.text(`Page ${doc.getNumberOfPages()} of 2`, w - 20, h - 5, { align: 'right' })
}

export function generatePlatformActivityReport(data: PlatformReportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  drawPage1_CoverAndSummary(doc, data)
  drawPage2_DetailedBreakdown(doc, data)

  const date = new Date().toISOString().split('T')[0]
  doc.save(`YCKF-Platform-Report-${date}.pdf`)
}
