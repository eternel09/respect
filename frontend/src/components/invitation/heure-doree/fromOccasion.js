import { calendarHref, eventNames, mapsUrl, sealOf } from '../../../lib/invitationTheme'

const wall = (iso) => (/T(\d{2}:\d{2})/.exec(iso || '') || [])[1] || ''

/**
 * Configuration « Heure dorée » d'un événement Signiq et de l'invité du lien
 * personnel (`/confirmer/{token}`) : la page de l'invité et l'aperçu du
 * back-office passent par ici ; le modèle ne lit que la configuration.
 */
export function configFromOccasion({ occasion: o, guest = {}, status, token, tableLabel, apiBase = '/api' }) {
  const c = o.content || {}
  const { title, couple } = eventNames(o.name)
  const [venue, ...rest] = (o.location || '').split(',')
  const photos = o.photos || []
  const party = Number(c.party_max) || null
  return {
    template: 'heure-doree',
    kind: o.type === 'mariage' ? 'wedding' : 'event',
    lang: 'fr',
    title,
    couple: { groom: couple?.[0] || '', bride: couple?.[1] || '', monogram: sealOf(o) },
    event: {
      date: o.date, start: wall(o.starts_at), end: wall(o.ends_at),
      ceremony: c.ceremony || null, venue: venue.trim(), address: rest.join(',').trim(),
      mapsUrl: o.location ? mapsUrl(o.location) : '',
      calendarUrl: token ? calendarHref(token, apiBase) : '',
      dress: c.dress_title || c.dress_text ? { title: c.dress_title || '', text: c.dress_text || '' } : null,
      expired: !!o.is_expired,
    },
    texts: { quote: c.verse || null, quoteBy: c.verse_ref || null, rsvpIntro: c.intro || null, closing: c.closing || null },
    hero: { image: o.cover_url || photos[0] || null },
    gallery: (o.cover_url ? photos : photos.slice(1)).map(src => ({ src, alt: '' })),
    story: (c.story || []).map(s => ({ year: s.year, title: s.title, text: s.text })),
    schedule: (c.program || []).map(p => ({ time: p.time, title: p.label, text: p.note })),
    rsvp: {
      endpoint: token ? `${apiBase}/rsvp/${token}` : '',
      deadline: c.rsvp_deadline || null,
      maxGuests: party,
      guest: {
        name: guest.name || '', email: guest.email || '', phone: guest.phone || '',
        status: status || guest.status || 'pending', partySize: guest.party_size || null, message: guest.message || '',
      },
    },
    pass: guest.qr ? { qr: guest.qr, name: guest.name, label: tableLabel || null } : null,
    music: o.music_url ? { src: o.music_url } : null,
    video: o.video_url ? { src: o.video_url } : null,
    app: { name: 'Signiq' },
  }
}
