import { prisma } from './db.js';

const PREFIX_MAP: Record<string, string> = {
  cybercrime: 'CYB',
  emergency: 'EMG',
  booking: 'BKG',
  enquiry: 'ENQ',
  theft: 'THF',
};

async function countExistingTickets(type: string, prefix: string, dateStr: string): Promise<number> {
  const searchPattern = `YCKF-${prefix}-${dateStr}`;
  switch (type) {
    case 'cybercrime':
      return prisma.report.count({ where: { ticketNumber: { startsWith: searchPattern } } });
    case 'emergency':
      return prisma.emergencyReport.count({ where: { ticketNumber: { startsWith: searchPattern } } });
    case 'booking':
      return prisma.booking.count({ where: { ticketNumber: { startsWith: searchPattern } } });
    case 'enquiry':
      return prisma.enquiry.count({ where: { ticketNumber: { startsWith: searchPattern } } });
    case 'theft':
      return prisma.stolenDeviceReport.count({ where: { ticketNumber: { startsWith: searchPattern } } });
    default:
      return prisma.emailLog.count({ where: { ticketNumber: { startsWith: searchPattern } } });
  }
}

export async function generateTicketNumber(type: string): Promise<string> {
  const prefix = PREFIX_MAP[type] || type.slice(0, 3).toUpperCase();
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  let attempts = 0;
  while (attempts < 10) {
    const baseCount = await countExistingTickets(type, prefix, dateStr);
    const seq = (baseCount + 1 + attempts).toString().padStart(6, '0');
    const candidate = `YCKF-${prefix}-${dateStr}-${seq}`;

    let exists = false;
    switch (type) {
      case 'cybercrime':
        exists = !!(await prisma.report.findFirst({ where: { ticketNumber: candidate } }));
        break;
      case 'emergency':
        exists = !!(await prisma.emergencyReport.findFirst({ where: { ticketNumber: candidate } }));
        break;
      case 'booking':
        exists = !!(await prisma.booking.findFirst({ where: { ticketNumber: candidate } }));
        break;
      case 'enquiry':
        exists = !!(await prisma.enquiry.findFirst({ where: { ticketNumber: candidate } }));
        break;
      case 'theft':
        exists = !!(await prisma.stolenDeviceReport.findFirst({ where: { ticketNumber: candidate } }));
        break;
    }

    if (!exists) return candidate;
    attempts++;
  }

  return `YCKF-${prefix}-${dateStr}-${Date.now().toString().slice(-6)}`;
}
