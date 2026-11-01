import { cardDate, eventNames, hashtag } from '../../lib/invitationTheme'

const goldText = (t) => ({ backgroundImage: t.gold, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' })

/** Alliances (deux anneaux entrelacés). */
const Rings = ({ t }) => (
  <svg viewBox="0 0 40 26" className="w-[9cqw] shrink-0" aria-hidden>
    <defs><linearGradient id="inv-ring" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f6e2a1" /><stop offset=".5" stopColor="#c99a3e" /><stop offset="1" stopColor="#f1d78f" /></linearGradient></defs>
    <circle cx="14" cy="13" r="9" fill="none" stroke="url(#inv-ring)" strokeWidth="2.6" />
    <circle cx="26" cy="13" r="9" fill="none" stroke="url(#inv-ring)" strokeWidth="2.6" />
    <title>{t.label}</title>
  </svg>
)

/**
 * La carte d'invitation, façon carte bancaire : QR de l'invité à la place de
 * la puce, date en « numéro de carte », lieu, table. Tailles en cqw : la
 * carte garde ses proportions à toutes les largeurs.
 */
export default function InviteCard({ occasion, guest, theme: t }) {
  const { title, couple } = eventNames(occasion.name)
  const date = cardDate(occasion)
  const table = guest.table ? (/^\d+$/.test(guest.table) ? `Table ${guest.table}` : guest.table) : null

  return (
    <div className="relative w-full overflow-hidden rounded-[4.5cqw] select-none inv-holo"
      style={{
        containerType: 'inline-size', aspectRatio: '1.586 / 1',
        background: `radial-gradient(120% 140% at 85% 0%, ${t.light} 0%, ${t.main} 45%, ${t.dark} 100%)`,
        boxShadow: '0 18px 40px -12px rgba(60,10,20,.45), 0 4px 10px rgba(60,10,20,.2), inset 0 1px 0 rgba(255,255,255,.12)',
      }}>
      {/* Trame losangée + grand monogramme en filigrane */}
      <div aria-hidden className="absolute inset-0 opacity-[.07]"
        style={{ backgroundImage: 'linear-gradient(45deg, #fff 1px, transparent 1px), linear-gradient(-45deg, #fff 1px, transparent 1px)', backgroundSize: '3.2cqw 3.2cqw' }} />
      <div aria-hidden className="absolute right-[20%] top-[-14%] inv-script text-[60cqw] leading-none text-white/[.05]">{(couple ? couple[0] : title)[0]}</div>

      <div className="relative h-full flex flex-col px-[6cqw] pt-[5cqw] pb-[4.5cqw] text-white">
        {/* Titre + badge */}
        <div className="flex items-start justify-between">
          <span className="inv-script text-[7.4cqw] leading-none mt-[1cqw]" style={{ color: '#fbf3e4' }}>{t.label}</span>
          <span className="rounded-[1.4cqw] px-[2.6cqw] py-[1.1cqw] text-center leading-[1.15] font-semibold tracking-[.18em] text-[1.9cqw] text-[#4b4b4b]"
            style={{ background: 'linear-gradient(135deg, #f4f4f4, #bdbdbd 45%, #f7f7f7 60%, #a9a9a9)', fontFamily: 'Jost, sans-serif' }}>
            CARTE<br />D'ACCÈS
          </span>
        </div>

        {/* Puce = QR de l'invité, sans contact, noms */}
        <div className="flex items-center mt-[3.4cqw] gap-[2.6cqw]">
          <div className="w-[12.5cqw] aspect-square rounded-[1.8cqw] p-[.9cqw] shrink-0" style={{ background: t.gold }}>
            {guest.qr && <img src={guest.qr} alt="" className="w-full h-full rounded-[.8cqw] bg-[#fbf3e4] p-[.4cqw]" draggable={false} />}
          </div>
          <span className="flex items-center gap-[1cqw] text-[3cqw] font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>
            e-Invitation
            <svg viewBox="0 0 24 24" className="w-[3.4cqw]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M8.5 8.5a5 5 0 0 1 0 7" /><path d="M12 5.5a9 9 0 0 1 0 13" /></svg>
          </span>
          <div className="ml-auto flex items-center gap-[1.6cqw] text-right">
            {couple ? (<>
              <span className="inv-cinzel font-semibold text-[3.9cqw] leading-none" style={goldText(t)}>{couple[0].toUpperCase()}</span>
              <Rings t={t} />
              <span className="inv-cinzel font-semibold text-[3.9cqw] leading-none" style={goldText(t)}>{couple[1].toUpperCase()}</span>
            </>) : (
              <span className="inv-cinzel font-semibold text-[3.6cqw] leading-tight max-w-[38cqw]" style={goldText(t)}>{title.toUpperCase()}</span>
            )}
          </div>
        </div>

        {/* Date en « numéro de carte » */}
        <div className="grid grid-cols-4 mt-auto" style={{ fontFamily: 'Jost, sans-serif' }}>
          {date.map(p => (
            <div key={p.label}>
              <div className="text-[7.4cqw] font-semibold tracking-[.04em] leading-none" style={{ textShadow: '0 1px 0 rgba(0,0,0,.35)' }}>{p.digits}</div>
              <div className="text-[1.9cqw] font-semibold uppercase tracking-[.12em] mt-[1.4cqw]" style={{ color: t.goldLight }}>{p.label}</div>
              <div className="text-[2.2cqw] text-white/85 leading-tight">{p.value}</div>
            </div>
          ))}
        </div>

        {/* Lieu, table, pastille */}
        <div className="flex items-end justify-between mt-[3cqw] gap-[2cqw]" style={{ fontFamily: 'Jost, sans-serif' }}>
          <div className="min-w-0 text-[2.3cqw] leading-snug">
            {occasion.location && (
              <p className="truncate"><b className="font-semibold uppercase tracking-[.12em] mr-[1.2cqw]" style={{ color: t.goldLight }}>Lieu</b>{occasion.location}</p>
            )}
            <p className="mt-[1cqw] truncate">
              <span className="inline-block rounded-full px-[1.8cqw] py-[.3cqw] mr-[1.2cqw] text-[1.9cqw] font-semibold uppercase tracking-[.12em] text-[#4a2a08]" style={{ background: t.gold }}>
                {table ? 'Table' : 'Invité(e)'}
              </span>
              {table ? `${table} · ${guest.name}` : guest.name}
            </p>
          </div>
          <div className="relative shrink-0 w-[19cqw] h-[11cqw]" aria-hidden>
            <span className="absolute left-0 top-0 h-full aspect-square rounded-full opacity-95" style={{ background: t.gold }} />
            <span className="absolute right-0 top-0 h-full aspect-square rounded-full opacity-80" style={{ background: t.gold }} />
            <span className="absolute inset-0 flex items-center justify-center text-[1.75cqw] font-semibold text-[#5a3a0a] tracking-[.02em]">{hashtag(occasion.name)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
