/**
 * Ouverture des pages Notion.
 *
 * Sur iPhone et iPad, une URL notion.so ou app.notion.com est un « universal
 * link » : iOS la détourne vers l'application Notion. Le schéma
 * `x-safari-https://` est enregistré par Safari et force l'ouverture dans le
 * navigateur — c'est le seul moyen fiable de contourner le détournement.
 *
 * Sur toutes les autres plateformes, le lien reste une URL normale.
 */

export function estAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ se déclare « Macintosh » mais expose le tactile.
  const iPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  return iOS || iPadOS
}

export function lienNotion(url: string | null, forcerSafari: boolean): string | null {
  if (!url) return null
  if (!forcerSafari || !estAppleMobile()) return url
  return url.replace(/^https:\/\//, 'x-safari-https://')
}

/** Ce que le bouton doit annoncer, selon la plateforme et le réglage. */
export function libelleOuverture(forcerSafari: boolean): string {
  return forcerSafari && estAppleMobile() ? 'Ouvrir dans Safari' : 'Ouvrir dans Notion'
}
