import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'yckfadmin@youngcyberknightsfoundation.org', fullName: 'YCKF Super Admin', password: 'admin@123', role: 'SUPER_ADMIN' as const },
    { email: 'secondadmin@yckf.org', fullName: 'Second Admin', password: 'admin@123', role: 'ADMIN' as const },
    { email: 'mypracticalworks@gmail.com', fullName: 'Bright Peter Kwaku Boateng', password: 'volunteer@123', role: 'VOLUNTEER' as const },
    { email: 'user@youngcyberknightsfoundation.org', fullName: 'Demo User', password: 'user@123', role: 'USER' as const },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      if (existing.fullName !== u.fullName) {
        await prisma.user.update({ where: { email: u.email }, data: { fullName: u.fullName } });
        console.log(`Updated ${u.email} fullName to "${u.fullName}"`);
      } else {
        console.log(`User ${u.email} already exists, skipping`);
      }
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { email: u.email, fullName: u.fullName, passwordHash, role: u.role } });
    console.log(`Created ${u.role}: ${u.email} / ${u.password}`);
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
