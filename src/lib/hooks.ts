import { useEffect, useRef, useState } from 'react'

/** Horloge qui se recale sur la minute pleine, et se resynchronise au retour d'onglet. */
export function useMinute(): Date {
  const [maintenant, setMaintenant] = useState(() => new Date())
  useEffect(() => {
    let timeout: number
    const planifier = () => {
      const d = new Date()
      const reste = 60000 - (d.getSeconds() * 1000 + d.getMilliseconds())
      timeout = window.setTimeout(() => {
        setMaintenant(new Date())
        planifier()
      }, reste + 20)
    }
    planifier()
    const auRetour = () => {
      if (document.visibilityState === 'visible') setMaintenant(new Date())
    }
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])
  return maintenant
}

/** Horloge à la seconde — réservée au mode Focus. */
export function useSeconde(actif: boolean): Date {
  const [maintenant, setMaintenant] = useState(() => new Date())
  useEffect(() => {
    if (!actif) return
    const i = window.setInterval(() => setMaintenant(new Date()), 1000)
    return () => window.clearInterval(i)
  }, [actif])
  return maintenant
}

export function useMouvementReduit(): boolean {
  const [reduit, setReduit] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = (e: MediaQueryListEvent) => setReduit(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return reduit
}

/** Enregistre une valeur après un délai d'inactivité (bloc-notes). */
export function useEnregistrementDiffere(
  valeur: string,
  enregistrer: (v: string) => void,
  delai = 500,
): 'repos' | 'en-cours' | 'enregistre' {
  const [etat, setEtat] = useState<'repos' | 'en-cours' | 'enregistre'>('repos')
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    setEtat('en-cours')
    const t = window.setTimeout(() => {
      enregistrer(valeur)
      setEtat('enregistre')
    }, delai)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur, delai])
  return etat
}

export function useCopie(): [string | null, (texte: string) => void] {
  const [copie, setCopie] = useState<string | null>(null)
  const copier = (texte: string) => {
    const finir = () => {
      setCopie(texte)
      window.setTimeout(() => setCopie((c) => (c === texte ? null : c)), 1200)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texte).then(finir).catch(finir)
    } else {
      const zone = document.createElement('textarea')
      zone.value = texte
      document.body.appendChild(zone)
      zone.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(zone)
      }
      finir()
    }
  }
  return [copie, copier]
}
