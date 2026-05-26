'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import TopNav from '@/components/TopNav'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const BMC_IMAGE_PATH = '/bmc_explainer.png'

export default function StartBMCPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [imageExists, setImageExists] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Check if the explainer image has been added to /public
    fetch(BMC_IMAGE_PATH, { method: 'HEAD' })
      .then((r) => setImageExists(r.ok))
      .catch(() => setImageExists(false))
  }, [])

  if (!projectId) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={projectId} />

      <motion.div className="pt-14 px-6 pb-16 max-w-2xl mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <div style={{ paddingTop: 32 }}>
          <button
            onClick={() => router.push(`/project/${projectId}/onboarding`)}
            style={{
              fontSize: 12,
              color: 'var(--color-foreground-muted)',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground-muted)')}
          >
            ← Indietro
          </button>
          <h1
            style={{
              fontWeight: 400,
              fontSize: 34,
              letterSpacing: '-0.03em',
              color: 'var(--color-foreground)',
              marginBottom: 28 }}
          >
            Ho già il mio modello di business
          </h1>

          <p
            style={{
              fontSize: 15,
              color: 'var(--color-foreground)',
              lineHeight: 1.75,
              marginBottom: 20 }}
          >
            Un Business Model Canvas descrive come funziona un&apos;organizzazione su una sola pagina,
            attraverso nove blocchi. Si parte dai segmenti di clientela: chi sono le persone o le
            organizzazioni a cui ti rivolgi. Da lì si definisce la proposta di valore: cosa offri loro e
            perché dovrebbero sceglierti. Poi i canali attraverso cui li raggiungi e il tipo di relazione
            che costruisci con loro. I flussi di ricavo descrivono come e quanto pagano.
          </p>

          <p
            style={{
              fontSize: 15,
              color: 'var(--color-foreground)',
              lineHeight: 1.75,
              marginBottom: 36 }}
          >
            Sul lato sinistro ci sono le risorse di cui hai bisogno per operare, le attività principali
            che svolgi ogni giorno e i partner con cui collabori. Infine la struttura dei costi: tutto
            quello che spendi per far funzionare il modello.
          </p>

          {/* Image area */}
          <div
            style={{
              width: '100%',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 36,
              border: '0.5px solid rgba(19,163,137,0.3)' }}
          >
            {imageExists ? (
              <Image
                src={BMC_IMAGE_PATH}
                alt="Business Model Canvas"
                width={800}
                height={480}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  minHeight: 220,
                  backgroundColor: 'rgba(19,163,137,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center' }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-foreground-faint)',
                    fontStyle: 'italic' }}
                >
                  Immagine: bmc_explainer.png
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(`/project/${projectId}/bmcs/new`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 28px',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-primary-hover)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(19,163,137,0.25)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-primary)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            Inizia a compilare
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
