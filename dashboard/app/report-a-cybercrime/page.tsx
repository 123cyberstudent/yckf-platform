'use client'

import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback } from 'react'
import { CalendarIcon, AlertCircle, CheckCircle, MapPin, Loader2, Navigation, ExternalLink, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
  gpsAddress: string
  locationName: string
  nearestLandmark: string
  googleMapLink: string
  plusCode?: string
  source: 'gps' | 'ip' | 'manual'
}

export default function ReportCybercrimePage() {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoDetected, setGeoDetected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [refining, setRefining] = useState(false)
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'manual' | null>(null)
  const [manualQuery, setManualQuery] = useState('')
  const [manualSearching, setManualSearching] = useState(false)

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<Partial<GeoLocation>> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=19&addressdetails=1&accept-language=en`,
        { headers: { 'User-Agent': 'YCKF-Cybercrime-Report/1.0' } }
      )
      if (!res.ok) return {}
      const data = await res.json()
      const addr = data.address || {}

      const parts: string[] = []
      if (addr.house_number && addr.road) parts.push(`${addr.road} ${addr.house_number}`)
      else if (addr.road) parts.push(addr.road)
      if (addr.pedestrian) parts.push(addr.pedestrian)
      if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood)
      if (addr.city_district || addr.district) parts.push(addr.city_district || addr.district)
      if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
      if (addr.state || addr.region) parts.push(addr.state || addr.region)
      if (addr.country) parts.push(addr.country)
      const gpsAddress = parts.join(', ') || data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`

      const locationNameParts: string[] = []
      if (addr.suburb || addr.neighbourhood) locationNameParts.push(addr.suburb || addr.neighbourhood)
      if (addr.city_district || addr.district) locationNameParts.push(addr.city_district || addr.district)
      if (addr.city || addr.town || addr.village) locationNameParts.push(addr.city || addr.town || addr.village)
      const locationName = locationNameParts.join(', ') || 'Unknown area'

      const landmarkParts: string[] = []
      if (addr.house_number && addr.road) landmarkParts.push(`${addr.road} ${addr.house_number}`)
      if (addr.landmark) landmarkParts.push(addr.landmark)
      if (addr.amenity) landmarkParts.push(addr.amenity)
      if (addr.building) landmarkParts.push(addr.building)
      if (addr.tourism) landmarkParts.push(addr.tourism)
      if (addr.shop) landmarkParts.push(addr.shop)
      if (addr.office) landmarkParts.push(addr.office)
      if (addr.pub) landmarkParts.push(addr.pub)
      if (addr.restaurant) landmarkParts.push(addr.restaurant)
      const nearestLandmark = landmarkParts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',').trim() || 'Not available'

      const plusCode = data.pluscode || ''

      return { gpsAddress, locationName, nearestLandmark, plusCode: plusCode || undefined }
    } catch {
      return {}
    }
  }, [])

  const buildLocationFromCoords = useCallback(async (lat: number, lon: number, accuracy: number, source: 'gps' | 'ip'): Promise<GeoLocation> => {
    const googleMapLink = `https://www.google.com/maps?q=${lat},${lon}&z=18`
    const geoDetails = await reverseGeocode(lat, lon)
    return {
      latitude: lat,
      longitude: lon,
      accuracy,
      gpsAddress: geoDetails.gpsAddress || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      locationName: geoDetails.locationName || 'Unknown area',
      nearestLandmark: geoDetails.nearestLandmark || 'Not available',
      googleMapLink,
      plusCode: geoDetails.plusCode,
      source,
    }
  }, [reverseGeocode])

  const detectViaIP = useCallback(async () => {
    try {
      const res = await fetch('https://ipapi.co/json/')
      if (!res.ok) return null
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lon: data.longitude, accuracy: 5000 }
      }
    } catch {}
    try {
      const res = await fetch('https://ipinfo.io/json')
      if (!res.ok) return null
      const data = await res.json()
      if (data.loc) {
        const [lat, lon] = data.loc.split(',').map(Number)
        return { lat, lon, accuracy: 10000 }
      }
    } catch {}
    return null
  }, [])

  const MAX_RETRIES = 5
  const detectLocation = useCallback(async (attempt = 0, isRefine = false) => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser')
      return
    }

    if (attempt === 0) {
      if (isRefine) {
        setRefining(true)
      } else {
        setGeoLoading(true)
      }
      setGeoError(null)
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy, altitudeAccuracy } = position.coords
        const isRealGPS = accuracy < 100
        const source: 'gps' | 'ip' = isRealGPS ? 'gps' : 'ip'

        const newLocation = await buildLocationFromCoords(latitude, longitude, accuracy, source)

        setGeoLocation((prev) => {
          if (!prev || accuracy < prev.accuracy) return newLocation
          return prev
        })
        setLocationSource((prev) => {
          if (!prev || accuracy < (prev === 'gps' ? 100 : 5000)) return source
          return prev
        })
        setGeoDetected(true)

        if (accuracy > 50 && attempt < MAX_RETRIES - 1) {
          setTimeout(() => detectLocation(attempt + 1, isRefine), 2000)
        } else {
          setGeoLoading(false)
          setRefining(false)
        }
      },
      async (err) => {
        if (attempt < 2) {
          setTimeout(() => detectLocation(attempt + 1, isRefine), 2000)
          return
        }

        if (attempt < MAX_RETRIES - 1) {
          setTimeout(() => detectLocation(attempt + 1, isRefine), 2000)
          return
        }

        const ipResult = await detectViaIP()
        if (ipResult) {
          const newLocation = await buildLocationFromCoords(ipResult.lat, ipResult.lon, ipResult.accuracy, 'ip')
          setGeoLocation(newLocation)
          setLocationSource('ip')
          setGeoDetected(true)
          setGeoLoading(false)
          setRefining(false)
          return
        }

        setGeoLoading(false)
        setRefining(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location access denied. You can search for your location manually below, or enable permissions in your browser settings.')
            break
          case err.POSITION_UNAVAILABLE:
            setGeoError('GPS unavailable. Trying to locate via internet connection...')
            break
          case err.TIMEOUT:
            setGeoError('GPS timed out. Trying alternative methods...')
            break
          default:
            setGeoError('Could not detect GPS location. You can search manually below.')
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }, [buildLocationFromCoords, detectViaIP])

  const searchManualLocation = async () => {
    if (!manualQuery.trim()) return
    setManualSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(manualQuery)}&limit=1&addressdetails=1&accept-language=en`,
        { headers: { 'User-Agent': 'YCKF-Cybercrime-Report/1.0' } }
      )
      if (!res.ok) return
      const results = await res.json()
      if (results.length > 0) {
        const r = results[0]
        const lat = parseFloat(r.lat)
        const lon = parseFloat(r.lon)
        const newLocation = await buildLocationFromCoords(lat, lon, 10, 'manual')
        setGeoLocation(newLocation)
        setLocationSource('manual')
        setGeoDetected(true)
        setGeoError(null)
      } else {
        setGeoError('Location not found. Try a more specific search (e.g. "Kumasi, Ghana").')
      }
    } catch {
      setGeoError('Search failed. Please try again.')
    } finally {
      setManualSearching(false)
    }
  }

  useEffect(() => {
    detectLocation(0, false)
  }, [detectLocation])

  const copyCoordinates = () => {
    if (!geoLocation) return
    navigator.clipboard.writeText(`${geoLocation.latitude}, ${geoLocation.longitude}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const payload = {
      fullName: fd.get('fullName'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      address: fd.get('address'),
      incidentDate: date ? format(date, 'yyyy-MM-dd') : '',
      incidentTime: time,
      incidentType: fd.get('incidentType'),
      description: fd.get('description'),
      location: fd.get('location'),
      reporterLocation: geoLocation ? {
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        accuracy: geoLocation.accuracy,
        gpsAddress: geoLocation.gpsAddress,
        locationName: geoLocation.locationName,
        nearestLandmark: geoLocation.nearestLandmark,
        googleMapLink: geoLocation.googleMapLink,
        plusCode: geoLocation.plusCode || '',
      } : null,
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit report')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl space-y-8 text-center py-20">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="size-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Report Submitted</h1>
          <p className="text-xl text-muted-foreground">
            Thank you for your report. Our team will review it and get back to you. Your identity is protected.
          </p>
          {geoLocation && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-left">
              <p className="text-sm font-medium text-green-800 mb-1">Your location was captured:</p>
              <p className="text-sm text-green-700">{geoLocation.gpsAddress}</p>
              <a href={geoLocation.googleMapLink} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
              </a>
            </div>
          )}
          <Button asChild>
            <a href="/">Back to Home</a>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5">
          <div className="space-y-4 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-primary">Report a Cybercrime</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Report cybercrime safely & securely.</h1>
            <p className="mx-auto max-w-3xl text-lg leading-9 text-muted-foreground sm:text-xl">
              Your report helps us investigate and take action. Your identity and information are protected.
            </p>
          </div>
        </section>

        {/* Location Detection Card */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10">
              <MapPin className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground">Your Current Location</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                We automatically detect your location to help investigators respond faster.
              </p>

              {geoLoading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#2563EB]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Detecting your location...</span>
                </div>
              )}

              {geoError && (
                <div className="mt-3">
                  <p className="text-sm text-red-600">{geoError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-full"
                    onClick={() => detectLocation(0, false)}
                    disabled={geoLoading}
                  >
                    <Navigation className="mr-2 h-3.5 w-3.5" /> Try Again
                  </Button>
                </div>
              )}

              {!geoLoading && !geoDetected && !geoError && (
                <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => detectLocation(0, false)}>
                  <Navigation className="mr-2 h-3.5 w-3.5" /> Detect My Location
                </Button>
              )}

              {geoDetected && geoLocation && (
                <div className="mt-3 space-y-2.5">
                  {refining && (
                    <div className="flex items-center gap-2 rounded-lg bg-[#2563EB]/5 border border-[#2563EB]/20 px-3 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                      <span className="text-xs font-medium text-[#2563EB]">Improving accuracy... current: ~{Math.round(geoLocation.accuracy)}m</span>
                    </div>
                  )}
                  {locationSource && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                      locationSource === 'gps' ? 'bg-green-50 text-green-700 border border-green-200' :
                      locationSource === 'manual' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                      {locationSource === 'gps' && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                      {locationSource === 'ip' && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />}
                      {locationSource === 'manual' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      {locationSource === 'gps' ? 'GPS Detected' : locationSource === 'manual' ? 'Manually Set' : 'Approximate (IP)'}
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">GPS Address</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{geoLocation.gpsAddress}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location Name</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{geoLocation.locationName}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nearest Landmark</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{geoLocation.nearestLandmark}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Coordinates</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-medium text-foreground font-mono">
                          {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
                        </p>
                        <button type="button" onClick={copyCoordinates} className="text-muted-foreground hover:text-foreground transition-colors">
                          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Accuracy:{' '}
                        {geoLocation.accuracy <= 10 ? (
                          <span className="text-green-600 font-semibold">Excellent (~{Math.round(geoLocation.accuracy)}m)</span>
                        ) : geoLocation.accuracy <= 30 ? (
                          <span className="text-blue-600 font-semibold">Good (~{Math.round(geoLocation.accuracy)}m)</span>
                        ) : geoLocation.accuracy <= 100 ? (
                          <span className="text-yellow-600 font-semibold">Fair (~{Math.round(geoLocation.accuracy)}m)</span>
                        ) : (
                          <span className="text-red-600 font-semibold">Low (~{Math.round(geoLocation.accuracy)}m)</span>
                        )}
                      </p>
                      {geoLocation.plusCode && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Plus Code: {geoLocation.plusCode}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={geoLocation.googleMapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => detectLocation(0, true)}
                      disabled={refining}
                    >
                      {refining ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Refining... ({Math.round(geoLocation?.accuracy || 0)}m)
                        </>
                      ) : (
                        <>
                          <Navigation className="mr-2 h-3.5 w-3.5" />
                          Refine GPS
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual search — always visible as fallback */}
              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {geoDetected ? 'Wrong location? Search manually:' : 'Or search your location manually:'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchManualLocation() } }}
                    placeholder="e.g. Kumasi, Ghana"
                    className="flex-1 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl shrink-0"
                    onClick={searchManualLocation}
                    disabled={manualSearching || !manualQuery.trim()}
                  >
                    {manualSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/80 p-8">
          <h2 className="text-3xl font-semibold text-white">Reporting Form</h2>

          {error && (
            <div className="mt-4 rounded-lg p-4 flex items-center gap-3 bg-red-50 border border-red-200">
              <AlertCircle className="size-5 text-red-600" />
              <p className="text-base font-medium text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <input
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
              type="text"
              name="fullName"
              placeholder="Full Name"
              required
            />
            <input
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
              type="tel"
              name="phone"
              placeholder="Phone Number"
            />
            <input
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
              type="email"
              name="email"
              placeholder="Email Address"
              required
            />
            <input
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
              type="text"
              name="address"
              placeholder="Address (optional)"
            />

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
                className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
                type="time"
                name="incidentTime"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <input
              className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
              type="text"
              name="location"
              placeholder="Location of incident (optional)"
            />

            <select
              name="incidentType"
              className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
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
              className="col-span-full rounded-3xl border border-border/70 bg-background/70 px-4 py-3 text-base text-foreground outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition-colors"
              rows={5}
              name="description"
              placeholder="Describe what happened..."
              required
            />

            <Button type="submit" className="col-span-full rounded-full bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        </section>
      </div>
    </main>
  )
}
