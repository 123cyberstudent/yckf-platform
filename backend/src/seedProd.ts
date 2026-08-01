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
// This seed is safe to run on every deploy: it only upserts the default
// accounts and missing content pages. It never deletes or resets any other
// user, and existing content pages are left untouched.
const DEFAULT_USERS: SeedUser[] = [
  { email: 'mypracticalworks@gmail.com', fullName: 'Bright Peter Kwaku Boateng', password: 'SecureSuperAdmin@2026', role: 'SUPER_ADMIN', phone: '+233553141199' },
  { email: 'secondaryadmin@yckf.org', fullName: 'Secondary Admin', password: 'SecureSecondaryAdmin@2026', role: 'ADMIN' },
  { email: 'volunteer@yckf.org', fullName: 'Volunteer', password: 'SecureVolunteer@2026', role: 'VOLUNTEER' },
  { email: 'user@yckf.org', fullName: 'Demo User', password: 'SecureUser@2026', role: 'USER', phone: '+233505313578' },
];

async function upsertUser(u: SeedUser): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  const passwordHash = await hashPassword(u.password);
  if (existing) {
    await prisma.user.update({
      where: { email: u.email },
      data: { fullName: u.fullName, passwordHash, role: u.role, phone: u.phone ?? null },
    });
    console.log(`Updated ${u.role}: ${u.email}`);
  } else {
    await prisma.user.create({
      data: { email: u.email, fullName: u.fullName, passwordHash, role: u.role, phone: u.phone ?? null },
    });
    console.log(`Created ${u.role}: ${u.email}`);
  }
}

async function main() {
  for (const u of DEFAULT_USERS) {
    await upsertUser(u);
  }

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
    if (existing) continue;
    await prisma.contentPage.create({ data: p });
    console.log(`Created content page: ${p.slug}`);
  }

  console.log('Production seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
