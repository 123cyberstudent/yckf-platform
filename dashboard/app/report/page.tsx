'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export default function ReportPage() {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>('')

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Report a Cybercrime</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Report cybercrime safely & securely.</h1>
            <p className="mx-auto max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              Your report helps us investigate and take action. Your identity and information are protected.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Reporting Form</h2>
          <form className="mt-8 grid gap-4 sm:grid-cols-2">
            <input 
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
              type="text" 
              placeholder="Full Name" 
              required 
            />
            <input 
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
              type="tel" 
              placeholder="Phone Number" 
            />
            <input 
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
              type="email" 
              placeholder="Email Address" 
              required 
            />
            <input 
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
              type="text" 
              placeholder="Address (optional)" 
            />
            
            {/* Date and Time Picker */}
            <div className="col-span-full grid gap-4 sm:grid-cols-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start rounded-3xl border-border/70 bg-background/70 px-4 py-3 text-left text-sm font-normal text-foreground hover:bg-background/90",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="rounded-3xl border border-border/70 bg-card"
                  />
                </PopoverContent>
              </Popover>

              <input
                className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <select 
              className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
              required
            >
              <option value="">Incident Type</option>
              <option>Phishing</option>
              <option>Hacking</option>
              <option>Identity Theft</option>
              <option>Online Fraud</option>
              <option>Cyberbullying</option>
              <option>Data Breach</option>
              <option>Malware/Ransomware</option>
              <option>Online Scams</option>
              <option>Other</option>
            </select>
            
            <textarea 
              className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
              rows={5} 
              placeholder="Description" 
              required 
            />
            
            <div className="col-span-full flex flex-wrap items-center gap-4">
              <label className="flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
                <span>Evidence Upload</span>
                <input 
                  type="file" 
                  className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none" 
                  multiple 
                />
              </label>
              <span className="rounded-full bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Max 10MB per file</span>
            </div>
            
            <Button type="submit" className="col-span-full rounded-full">Submit Report</Button>
          </form>
        </section>
      </div>
    </main>
  )
}