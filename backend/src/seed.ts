import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from './auth/password.js';

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  fullName: string;
  password: string;
  role: Role;
  phone?: string | null;
}

// Default login credentials for the whole project (mobile + dashboard).
// Phone numbers (for SMS OTP delivery): SUPER_ADMIN -> MTN, USER -> Telcel.
const DEFAULT_USERS: SeedUser[] = [
  { email: 'mypracticalworks@gmail.com', fullName: 'Bright Peter Kwaku Boateng', password: 'SecureSuperAdmin@2026', role: 'SUPER_ADMIN', phone: '+233553141199' },
  { email: 'secondaryadmin@yckf.org', fullName: 'Secondary Admin', password: 'SecureSecondaryAdmin@2026', role: 'ADMIN' },
  { email: 'volunteer@yckf.org', fullName: 'Volunteer', password: 'SecureVolunteer@2026', role: 'VOLUNTEER' },
  { email: 'user@yckf.org', fullName: 'Demo User', password: 'SecureUser@2026', role: 'USER', phone: '+233505313578' },
];

// Legacy dev accounts replaced by the set above.
const LEGACY_EMAILS = [
  'yckfadmin@youngcyberknightsfoundation.org',
  'user@youngcyberknightsfoundation.org',
  'secondadmin@yckf.org',
];

async function removeUserData(userId: number): Promise<void> {
  await prisma.$transaction([
    prisma.loginChallenge.deleteMany({ where: { userId } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.loginLog.deleteMany({ where: { userId } }),
    prisma.auditLog.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { OR: [{ recipientId: userId }, { senderId: userId }] } }),
    prisma.coupon.deleteMany({ where: { createdById: userId } }),
    prisma.couponRedemption.deleteMany({ where: { userId } }),
    prisma.courseEnrolment.deleteMany({ where: { userId } }),
    prisma.creditLedgerEntry.deleteMany({ where: { userId } }),
    prisma.creditWallet.deleteMany({ where: { userId } }),
    prisma.promotionRedemption.deleteMany({ where: { userId } }),
    prisma.refund.deleteMany({ where: { OR: [{ requestedById: userId }, { order: { userId } }] } }),
    prisma.orderItem.deleteMany({ where: { order: { userId } } }),
    prisma.webhookEvent.deleteMany({ where: { paymentAttempt: { userId } } }),
    prisma.paymentAttempt.deleteMany({ where: { userId } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.caseResponse.deleteMany({ where: { OR: [{ authorId: userId }, { case: { report: { userId } } }] } }),
    prisma.evidence.deleteMany({ where: { OR: [{ uploadedById: userId }, { report: { userId } }] } }),
    prisma.investigationNote.deleteMany({ where: { OR: [{ authorId: userId }, { case: { report: { userId } } }] } }),
    prisma.caseHistory.deleteMany({ where: { OR: [{ changedById: userId }, { case: { report: { userId } } }] } }),
    prisma.case.deleteMany({ where: { OR: [{ report: { userId } }, { assignedInvestigatorId: userId }] } }),
    prisma.report.deleteMany({ where: { userId } }),
    prisma.user.deleteMany({ where: { id: userId } }),
  ]);
}

async function upsertUser(u: SeedUser): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  const passwordHash = await hashPassword(u.password);
  if (existing) {
    await prisma.user.update({
      where: { email: u.email },
      data: { fullName: u.fullName, passwordHash, role: u.role, phone: u.phone ?? null },
    });
    console.log(`Updated ${u.role}: ${u.email} / ${u.password}${u.phone ? ` (phone ${u.phone})` : ''}`);
  } else {
    await prisma.user.create({
      data: { email: u.email, fullName: u.fullName, passwordHash, role: u.role, phone: u.phone ?? null },
    });
    console.log(`Created ${u.role}: ${u.email} / ${u.password}${u.phone ? ` (phone ${u.phone})` : ''}`);
  }
}

async function main() {
  const legacyUsers = await prisma.user.findMany({ where: { email: { in: LEGACY_EMAILS } }, select: { id: true, email: true } });
  for (const legacy of legacyUsers) {
    await removeUserData(legacy.id);
    console.log(`Removed legacy account: ${legacy.email}`);
  }

  for (const u of DEFAULT_USERS) {
    await upsertUser(u);
  }

  console.log('Seed complete');

  const pages = [
    { slug: 'about', title: 'About YCKF', content: { hero: { title: 'About Young Cyber Knights Foundation', subtitle: 'Building a safer digital future' }, mission: '', vision: '', values: [], timeline: [] } },
    { slug: 'resources', title: 'Resources', content: { hero: { title: 'Cyber Safety Resources', subtitle: 'Free tools and guides for digital safety' }, downloads: [], videos: [] } },
    { slug: 'courses', title: 'Courses & Certifications', content: { hero: { title: 'Cybersecurity Courses', subtitle: 'Professional certifications for all levels' }, courses: [] } },
    { slug: 'events', title: 'Events', content: { hero: { title: 'YCKF Events', subtitle: 'Join our cybersecurity community' }, upcomingEvents: [], pastEvents: [] } },
    { slug: 'news', title: 'News', content: { hero: { title: 'Latest News', subtitle: 'Stay updated with YCKF' }, featured: null, articles: [] } },
    { slug: 'volunteers', title: 'Our Volunteers', content: { hero: { title: 'Meet Our Volunteers', subtitle: 'The backbone of our mission' }, members: [] } },
  ];

  for (const p of pages) {
    const existing = await prisma.contentPage.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.log(`Content page ${p.slug} already exists, skipping`);
      continue;
    }
    await prisma.contentPage.create({ data: p });
    console.log(`Created content page: ${p.slug}`);
  }

  console.log('Content pages seeded');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
