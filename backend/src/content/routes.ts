import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin } from '../auth/middleware.js';

const router = Router();

const VALID_SLUGS = ['about', 'resources', 'courses', 'events', 'news', 'volunteers', 'contact'];

const DEFAULT_CONTENT: Record<string, { title: string; content: object }> = {
  about: {
    title: 'About YCKF',
    content: {
      hero: { title: 'About Young Cyber Knights Foundation', subtitle: 'Building a safer digital future' },
      mission: '',
      vision: '',
      values: [],
      timeline: [],
    },
  },
  resources: {
    title: 'Resources',
    content: {
      hero: { title: 'Cyber Safety Resources', subtitle: 'Free tools and guides for digital safety' },
      downloads: [],
      videos: [],
    },
  },
  courses: {
    title: 'Courses & Certifications',
    content: {
      hero: { title: 'Cybersecurity Courses', subtitle: 'Professional certifications for all levels' },
      courses: [],
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
      hero: { title: 'Latest News', subtitle: 'Stay updated with YCKF' },
      featured: null,
      articles: [],
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
    }
    res.json(page);
  } catch (err) {
    console.error('Failed to get content page:', err);
    res.status(500).json({ error: 'Failed to get content page' });
  }
});

router.put('/:slug', verifyToken, isAdmin, async (req: Request, res: Response) => {
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
