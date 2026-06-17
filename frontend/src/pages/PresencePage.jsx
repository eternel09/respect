import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import api from '../lib/axios'

export default function PresencePage() {
  const [searchParams]        = useSearchParams()
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState(null)
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [event, setEvent]     = useState(null)

  const eventId = searchParams.get('event_id')

  useEffect(() => {
    if (!eventId) return
    api.get('/events/public')
      .then((res) => {
        const found = res.data.data?.find((e) => String(e.id) === eventId)
        setEvent(found || null)
      })
      .catch(() => {})
  }, [eventId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!eventId) {
      setStatus({ type: 'error', message: "Lien invalide : aucun événement spécifié." })
      return
    }
    setLoading(true)
    setStatus(null)
    setError(null)

    try {
      const res = await api.post('/attendance', { phone, event_id: Number(eventId) })
      setStatus({ type: 'success', message: res.data.message })
      setPhone('')
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 404) {
        setStatus({ type: 'error', message: data.message })
      } else if (err.response?.status === 409) {
        setStatus({ type: 'warning', message: data.message })
      } else if (err.response?.status === 422) {
        setError(data.errors?.phone?.[0] || data.errors?.event_id?.[0] || "Erreur de validation.")
      } else {
        setStatus({ type: 'error', message: "Une erreur est survenue. Veuillez réessayer." })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-gray-900">Pointage de présence</h1>
          {event ? (
            <p className="text-violet-600 font-medium mt-1">{event.name}</p>
          ) : (
            <p className="text-gray-500 mt-1">Famille Respect</p>
          )}
        </div>

        {status && (
          <div className="mb-4">
            <Alert type={status.type === 'warning' ? 'warning' : status.type}>
              {status.message}
            </Alert>
          </div>
        )}

        {!eventId && (
          <Alert type="error">
            Lien de présence invalide. Scannez le QR code fourni lors de l'événement.
          </Alert>
        )}

        {eventId && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Votre numéro de téléphone"
              type="tel"
              placeholder="+243812345678"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(null) }}
              error={error}
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              Pointer ma présence
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
