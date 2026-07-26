import { NextResponse } from 'next/server'

const YCKF_KNOWLEDGE = `You are YCKF AI Assistant for Young Cyber Knights Foundation.
You help users with cybersecurity questions, YCKF services, courses, events, volunteering, and reporting cybercrime.
Be helpful, concise, and professional. If you don't know something, direct them to contact YCKF.
YCKF phone: +233505313578
YCKF email: yckfadmin@youngcyberknightsfoundation.org
YCKF website: http://localhost:3000
Available pages: About, Courses, Events, News, Resources, Volunteers, Report Cybercrime, Contact.
Cybersecurity tips: Use strong passwords, enable 2FA, avoid public Wi-Fi for banking, keep software updated, back up data regularly.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function generateLocalResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.match(/\b(report|crime|cybercrime|scam|fraud|phishing|hack)\b/)) {
    return `To report a cybercrime to YCKF:\n\n1. Visit our reporting portal: http://localhost:3000/report-a-cybercrime\n2. Fill in the form with incident details\n3. You'll receive a report ID for tracking\n\nFor urgent matters, call +233505313578 or email yckfadmin@youngcyberknightsfoundation.org`
  }

  if (lower.match(/\b(course|certification|learn|training|study)\b/)) {
    return `YCKF offers cybersecurity courses for all levels:\n\n- Beginner: Cyber Safety Fundamentals\n- Intermediate: Ethical Hacking Basics\n- Advanced: Digital Forensics\n- Certifications: CompTIA Security+, CEH prep\n\nBrowse courses at: http://localhost:3000/courses`
  }

  if (lower.match(/\b(volunteer|join|help|contribute|team)\b/)) {
    return `Want to volunteer with YCKF?\n\nWe need volunteers for:\n- Cyber awareness education\n- Community outreach\n- Technical support\n- Event coordination\n\nApply at: http://localhost:3000/volunteers\nOr email: yckfadmin@youngcyberknightsfoundation.org`
  }

  if (lower.match(/\b(event|workshop|seminar|conference|meetup)\b/)) {
    return `Check our upcoming events at: http://localhost:3000/events\n\nWe regularly host:\n- Cybersecurity workshops\n- Community awareness sessions\n- Capture The Flag (CTF) competitions\n- Expert speaker events`
  }

  if (lower.match(/\b(password|secure|safety|protect|tip|advice)\b/)) {
    return `Here are essential cybersecurity tips:\n\n1. Use unique passwords for every account (12+ characters)\n2. Enable two-factor authentication (2FA)\n3. Never click suspicious links in emails or messages\n4. Keep your devices and software updated\n5. Avoid public Wi-Fi for banking or sensitive tasks\n6. Back up your data regularly\n\nNeed more help? Visit http://localhost:3000/resources`
  }

  if (lower.match(/\b(contact|reach|email|phone|call|location|address)\b/)) {
    return `Contact YCKF:\n\nPhone: +233505313578\nEmail: yckfadmin@youngcyberknightsfoundation.org\nWebsite: http://localhost:3000\nWhatsApp: +233505313578`
  }

  if (lower.match(/\b(about|mission|vision|who|what|yckf)\b/)) {
    return `Young Cyber Knights Foundation (YCKF) is dedicated to:\n\nMission: Building the next generation of cybersecurity professionals in Ghana and Africa.\nVision: A digitally safe Africa empowered by youth.\n\nWe provide education, awareness, and hands-on cybersecurity experiences.\n\nLearn more: http://localhost:3000/about`
  }

  if (lower.match(/\b(news|update|latest|article)\b/)) {
    return `Stay updated with YCKF news at: http://localhost:3000/news\n\nWe regularly publish articles on:\n- Latest cyber threats\n- Security best practices\n- YCKF achievements\n- Community stories`
  }

  if (lower.match(/\b(hello|hi|hey|greetings)\b/)) {
    return `Hello! Welcome to YCKF AI Assistant. I can help you with:\n\n- Reporting cybercrimes\n- Finding courses & certifications\n- Volunteering opportunities\n- Upcoming events\n- Cybersecurity tips\n- Contact information\n\nHow can I assist you today?`
  }

  if (lower.match(/\b(thank|thanks|appreciate)\b/)) {
    return `You're welcome! Is there anything else I can help you with regarding YCKF services or cybersecurity?`
  }

  return `I'm here to help with YCKF services and cybersecurity questions. You can ask me about:\n\n- Reporting cybercrimes\n- Courses & certifications\n- Volunteering\n- Events\n- Cybersecurity tips\n- Contact information\n\nOr type "help" to see all options.`
}

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY

    if (openaiKey) {
      try {
        const messages = [
          { role: 'system', content: YCKF_KNOWLEDGE },
          ...history.slice(-10).map((m: ChatMessage) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ]

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({ reply: data.choices[0].message.content })
        }
      } catch {
        // Fall through to local
      }
    }

    const reply = generateLocalResponse(message)
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
