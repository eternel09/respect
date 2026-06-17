import { useState } from 'react'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import api from '../lib/axios'

export default function OnboardingPage() {
  const [form, setForm]       = useState({ first_name: '', last_name: '', phone: '' })
  const [errors, setErrors]   = useState({})
  const [status, setStatus]   = useState(null) // { type, message }
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setErrors((e2) => ({ ...e2, [e.target.name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    setErrors({})

    try {
      const res = await api.post('/onboarding', form)
      setStatus({ type: 'success', message: res.data.message })
      setForm({ first_name: '', last_name: '', phone: '' })
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 409) {
        setStatus({ type: 'warning', message: data.message })
      } else if (err.response?.status === 422) {
        setErrors(
          Object.fromEntries(
            Object.entries(data.errors).map(([k, v]) => [k, v[0]])
          )
        )
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
          <div className="text-5xl mb-3">🤝</div>
          <h1 className="text-2xl font-bold text-gray-900">Famille Respect</h1>
          <p className="text-gray-500 mt-1">Inscription des membres</p>
        </div>

        {status && (
          <div className="mb-4">
            <Alert type={status.type === 'warning' ? 'warning' : status.type}>
              {status.message}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Prénom"
            name="first_name"
            placeholder="Jean"
            value={form.first_name}
            onChange={handleChange}
            error={errors.first_name}
          />
          <Input
            label="Nom"
            name="last_name"
            placeholder="Kabila"
            value={form.last_name}
            onChange={handleChange}
            error={errors.last_name}
          />
          <Input
            label="Numéro de téléphone"
            name="phone"
            type="tel"
            placeholder="+243812345678"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
          />
          <Button type="submit" loading={loading} className="w-full mt-2">
            S'inscrire
          </Button>
        </form>
      </Card>
    </div>
  )
}
