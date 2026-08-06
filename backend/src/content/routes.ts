import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isSuperAdmin } from '../auth/middleware.js';

const router = Router();

const VALID_SLUGS = ['about', 'resources', 'courses', 'events', 'news', 'volunteers', 'contact'];

const isEmptyValue = (v: unknown): boolean => {
  if (v === null || v === undefined || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
};

function backfillContent(stored: Record<string, any>, defaults: Record<string, any>): Record<string, any> {
  const merged: Record<string, any> = { ...stored };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const storedValue = merged[key];
    if (isEmptyValue(storedValue)) {
      merged[key] = defaultValue;
    } else if (Array.isArray(storedValue) && Array.isArray(defaultValue)) {
      merged[key] = storedValue.map((item: any, idx: number) => {
        const template = defaultValue[idx];
        if (item && typeof item === 'object' && !Array.isArray(item) && template && typeof template === 'object' && !Array.isArray(template)) {
          return backfillContent(item, template);
        }
        return item;
      });
    } else if (typeof storedValue === 'object' && !Array.isArray(storedValue) && typeof defaultValue === 'object' && defaultValue !== null) {
      merged[key] = backfillContent(storedValue, defaultValue);
    }
  }
  return merged;
}

const DEFAULT_CONTENT: Record<string, { title: string; content: object }> = {
  about: {
    title: 'About YCKF',
    content: {
      hero: { title: 'Empowering a Safer Digital World', subtitle: 'About Young Cyber Knights Foundation (YCKF)' },
      mission: 'Our mission is to empower individuals, businesses, and communities with the knowledge, tools, and support needed to stay safe and secure in an increasingly digital world. We advocate for inclusive cybersecurity education, promote responsible digital citizenship, and provide accessible resources to protect against evolving online threats.',
      vision: 'We envision a world where everyone has the confidence and capability to navigate the digital landscape securely. A future where every young person, business, and community across Africa is equipped to protect and secure their digital environment.',
      values: [
        { title: 'Security First', description: 'We put digital safety and resilience at the heart of everything we do, for individuals and organizations alike.' },
        { title: 'Inclusive Education', description: 'We believe digital safety is a right, not a privilege, and deliver accessible cybersecurity learning for everyone.' },
        { title: 'Youth Empowerment', description: 'We nurture the next generation of cybersecurity professionals with knowledge, skills, and hands-on opportunities.' },
        { title: 'Integrity & Ethics', description: 'We champion ethical technology use, demonstrated by our founder\u2019s advocacy for human-centred innovation.' },
        { title: 'Community Collaboration', description: 'We partner with schools, industry leaders, and local communities to make cybersecurity engaging and effective.' },
        { title: 'Innovation & Impact', description: 'We drive innovation and measurable change to build a smarter, digitally empowered Africa.' },
      ],
      timeline: [
        { year: '2024', event: 'Young Cyber Knights Foundation was founded in Kumasi, Ghana, to close the cybersecurity skills gap among young people.' },
        { year: '2025', event: 'Expanded school outreach, community training, and public awareness campaigns across Ghana, mentoring hundreds of students.' },
        { year: '2026', event: 'Founder & Supervisor Bright Peter Kwaku Boateng was honoured with Global African Youth Leader of the Year and Africa Innovator of the Year at the Africa Youth Leaders Awards.' },
      ],
    },
  },
  resources: {
    title: 'Resources',
    content: {
      hero: { title: 'Cyber Safety Resources', subtitle: 'Free tools and guides for digital safety' },
      downloads: [
        { title: 'Cyber Safety Basics Guide', format: 'PDF', description: 'A beginner-friendly guide to essential online safety practices, strong passwords, and spotting threats.', imageUrl: '' },
        { title: 'Safeguarding Teens Online', format: 'PDF', description: 'Practical advice for parents, guardians, and educators to keep young people safe on social media.', imageUrl: '' },
        { title: 'Phishing & Scam Awareness', format: 'PDF', description: 'Learn how to recognise phishing emails, fake websites, and online scams before they catch you out.', imageUrl: '' },
        { title: 'Sextortion & Online Blackmail', format: 'PDF', description: 'Understand sextortion threats and how to respond safely, seek help, and report to authorities.', imageUrl: '' },
      ],
      videos: [
        { title: 'Introduction to Cybersecurity - What every beginner should know' },
        { title: 'How to Stay Safe on Social Media' },
        { title: 'Cyber Hygiene: Strong Passwords & 2FA Explained' },
      ],
    },
  },
  courses: {
    title: 'Courses & Certifications',
    content: {
      hero: { title: 'Cybersecurity Courses', subtitle: 'Professional certifications for all levels' },
      courses: [
        { slug: 'cyber-safety-fundamentals', title: 'Cyber Safety Fundamentals', level: 'Beginner', duration: 'Self-paced', price: 'Free', description: 'Learn the essentials of online safety, strong passwords, safe browsing, and protecting your digital identity.', imageUrl: '' },
        { slug: 'ethical-hacking-basics', title: 'Ethical Hacking Basics', level: 'Intermediate', duration: '8 weeks', price: 'Free', description: 'Introduction to ethical hacking, recon, vulnerability discovery, and how ethical hackers secure systems.', imageUrl: '' },
        { slug: 'digital-forensics', title: 'Digital Forensics', level: 'Intermediate', duration: '8 weeks', price: 'Free', description: 'Hands-on digital forensics - evidence collection, analysis, and reporting for investigations.', imageUrl: '' },
        { slug: 'comptia-security-prep', title: 'CompTIA Security+ Prep', level: 'Advanced', duration: '12 weeks', price: 'Paid', description: 'Full courseware and labs to prepare you for the CompTIA Security+ certification exam.', imageUrl: '' },
        { slug: 'ceh-preparation', title: 'CEH Preparation', level: 'Advanced', duration: '12 weeks', price: 'Paid', description: 'Exam preparation for Certified Ethical Hacker, covering real-world penetration testing and countermeasures.', imageUrl: '' },
      ],
    },
  },
  events: {
    title: 'Events',
    content: {
      hero: { title: 'YCKF Events', subtitle: 'Join our cybersecurity community' },
      upcomingEvents: [],
      pastEvents: [],
    },
  },
  news: {
    title: 'News',
    content: {
      hero: { title: 'YCKF News & Events', subtitle: 'Stay updated with YCKF' },
      featured: {
        title: 'YCKF Founder Honoured with Global African Youth Leader of the Year 2026',
        category: 'Achievement',
        excerpt: 'Founder & Supervisor Bright Peter Kwaku Boateng was honoured with Global African Youth Leader of the Year and Africa Innovator of the Year at the Africa Youth Leaders Awards 2026.',
        author: 'YCKF Communications',
        date: 'May 2026',
        imageUrl: '',
      },
      articles: [
        { title: 'Africa Youth Leaders Awards 2026 - A Celebration of Impact', category: 'Achievement', excerpt: 'We celebrated impact, resilience, and innovation as the YCKF mission to shape Africa\u2019s digital future continues to grow.', author: 'YCKF Communications', date: 'May 2026', imageUrl: '' },
        { title: 'Raising Awareness on Sextortion', category: 'Public Awareness', excerpt: 'YCKF sheds light on the rising threat of sextortion, hidden victims, and the urgent action needed to protect young people online.', author: 'YCKF Communications', date: 'October 2025', imageUrl: '' },
        { title: 'Social Communication & Artificial Intelligence', category: 'Outreach', excerpt: 'Our founder addressed seminarians at St. Gregory the Great Provincial Major Seminary on using technology to enhance, not denigrate, humanity.', author: 'YCKF Communications', date: 'February 2026', imageUrl: '' },
      ],
    },
  },
  volunteers: {
    title: 'Our Volunteers',
    content: {
      hero: { title: 'Meet Our Volunteers', subtitle: 'The backbone of our mission' },
      members: [],
    },
  },
  contact: {
    title: 'Contact YCKF',
    content: {
      hero: {
        title: 'Get in Touch with YCKF',
        subtitle: "We're here to help.",
        description: 'Whether you are reporting cybercrime, seeking cybersecurity advice, or looking to partner with us – reach out today.',
      },
      phone: {
        numbers: ['+233505313578', '+233553141199'],
        availability: 'Mon\u2013Fri, 8 AM \u2013 6 PM (GMT)',
      },
      email: {
        general: 'info@youngcyberknightsfoundation.org',
        reporting: 'report@youngcyberknightsfoundation.org',
        media: 'media@youngcyberknightsfoundation.org',
      },
      address: {
        organization: 'Young Cyber Knights Foundation',
        poBox: 'P.O. Box',
        city: 'Accra, Ghana',
      },
      social: {
        linkedin: 'linkedin.com/company/youngcyberknights',
        twitter: '@ycik_foundation',
        facebook: 'facebook.com/youngcyberknights',
        youtube: 'youtube.com/@youngcyberknights',
        instagram: '@ycik_foundation',
      },
      faqs: [
        { question: 'How do I report a cybercrime?', answer: 'Use our reporting form on the Cybercrime Reporting page or email report@youngcyberknightsfoundation.org.' },
        { question: 'Is my report confidential?', answer: 'Yes. We maintain strict confidentiality. Your identity is only shared with law enforcement if required.' },
        { question: 'How can I become a volunteer?', answer: 'Visit our Volunteer page, fill out the application form, and our team will contact you within 5 business days.' },
        { question: 'Do you offer cybersecurity training?', answer: 'Yes. We offer free workshops and premium paid courses. Visit our Courses section for more details.' },
        { question: 'How can my organization partner with YCKF?', answer: 'Contact us at partnerships@youngcyberknightsfoundation.org with a brief proposal.' },
        { question: 'How quickly do you respond to cybercrime reports?', answer: 'We respond within 24\u201348 hours. Critical cases are prioritized.' },
      ],
    },
  },
};

router.get('/', async (_req: Request, res: Response) => {
  try {
    const pages = await prisma.contentPage.findMany({ orderBy: { slug: 'asc' } });
    res.json(pages);
  } catch (err) {
    console.error('Failed to list content pages:', err);
    res.status(500).json({ error: 'Failed to list content pages' });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!VALID_SLUGS.includes(slug)) {
      return res.status(404).json({ error: 'Page not found' });
    }
    let page = await prisma.contentPage.findUnique({ where: { slug } });
    if (!page) {
      const defaults = DEFAULT_CONTENT[slug];
      if (!defaults) return res.status(404).json({ error: 'Page not found' });
      page = await prisma.contentPage.create({ data: { slug, title: defaults.title, content: defaults.content } });
    } else {
      const defaults = DEFAULT_CONTENT[slug];
      if (defaults) {
        const merged = backfillContent(page.content as Record<string, any>, defaults.content);
        if (JSON.stringify(merged) !== JSON.stringify(page.content)) {
          page = await prisma.contentPage.update({
            where: { slug },
            data: { content: merged },
          });
        }
      }
    }
    res.json(page);
  } catch (err) {
    console.error('Failed to get content page:', err);
    res.status(500).json({ error: 'Failed to get content page' });
  }
});

router.put('/:slug', verifyToken, isSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!VALID_SLUGS.includes(slug)) {
      return res.status(400).json({ error: 'Invalid page slug' });
    }
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }
    const page = await prisma.contentPage.upsert({
      where: { slug },
      update: { title, content },
      create: { slug, title, content },
    });
    res.json(page);
  } catch (err) {
    console.error('Failed to update content page:', err);
    res.status(500).json({ error: 'Failed to update content page' });
  }
});

export default router;
