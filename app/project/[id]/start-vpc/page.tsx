'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import TopNav from '@/components/TopNav'
import { ArrowRight } from 'lucide-react'

const VPC_IMAGE_PATH = '/vpc_explainer.png'

export default function StartVPCPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [imageExists, setImageExists] = useState(false)

  useEffect(() => {
    params.then(({ id }) => setProjectId(id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Check if the explainer image has been added to /public
    fetch(VPC_IMAGE_PATH, { method: 'HEAD' })
      .then((r) => setImageExists(r.ok))
      .catch(() => setImageExists(false))
  }, [])

  if (!projectId) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={projectId} />

      <div className="pt-14 px-6 pb-16 max-w-2xl mx-auto">
        <div style={{ paddingTop: 48 }}>
          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 28,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              marginBottom: 28,
            }}
          >
            Ho già la mia proposta di valore
          </h1>

          <p
            style={{
              fontSize: 15,
              color: 'var(--color-ink)',
              lineHeight: 1.75,
              marginBottom: 20,
            }}
          >
            Un Value Proposition Canvas si costruisce in due parti. Si parte dal profilo del cliente, a
            destra: i suoi obiettivi quotidiani, i vantaggi che vorrebbe ottenere e le frustrazioni che
            vuole eliminare. Poi si passa alla mappa del valore, a sinistra: i prodotti e servizi che
            offri, i vantaggi concreti che crei e i problemi che risolvi.
          </p>

          <p
            style={{
              fontSize: 15,
              color: 'var(--color-ink)',
              lineHeight: 1.75,
              marginBottom: 36,
            }}
          >
            L&apos;obiettivo è trovare una corrispondenza precisa tra le due parti: ogni elemento della
            mappa del valore dovrebbe rispondere a qualcosa nel profilo del cliente.
          </p>

          {/* Image area */}
          <div
            style={{
              width: '100%',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 36,
              border: '0.5px solid rgba(199,123,58,0.3)',
            }}
          >
            {imageExists ? (
              <Image
                src={VPC_IMAGE_PATH}
                alt="Value Proposition Canvas"
                width={800}
                height={480}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  minHeight: 220,
                  backgroundColor: 'rgba(199,123,58,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-faint)',
                    fontStyle: 'italic',
                  }}
                >
                  Immagine: vpc_explainer.png
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(`/project/${projectId}/import-vpc`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 28px',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: 'var(--color-amber)',
              color: '#FFFFFF',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)')
            }
          >
            Inizia a compilare
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
