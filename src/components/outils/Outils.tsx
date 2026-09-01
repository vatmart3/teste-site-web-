import { useState } from 'react'
import { PlanComptable } from './PlanComptable'
import { Tva } from './Tva'
import { SaisieEcriture } from './SaisieEcriture'
import { Amortissements } from './Amortissements'
import { CalculsCommerciaux } from './CalculsCommerciaux'
import { SeuilRentabilite } from './SeuilRentabilite'
import { SimulateurMoyenne } from './SimulateurMoyenne'

const OUTILS = [
  { id: 'pcg', nom: 'Plan comptable', rendu: () => <PlanComptable /> },
  { id: 'tva', nom: 'TVA', rendu: () => <Tva /> },
  { id: 'ecriture', nom: "Saisie d'écriture", rendu: () => <SaisieEcriture /> },
  { id: 'amortissements', nom: 'Amortissements', rendu: () => <Amortissements /> },
  { id: 'commercial', nom: 'Calculs commerciaux', rendu: () => <CalculsCommerciaux /> },
  { id: 'seuil', nom: 'Seuil de rentabilité', rendu: () => <SeuilRentabilite /> },
  { id: 'moyenne', nom: 'Moyenne BTS', rendu: () => <SimulateurMoyenne /> },
] as const

export function Outils() {
  const [actif, setActif] = useState<string>('pcg')
  const courant = OUTILS.find((o) => o.id === actif) ?? OUTILS[0]

  return (
    <div>
      <div className="flex overflow-x-auto filet-b sticky top-0 bg-papier z-20" role="tablist" aria-label="Outils BTS CG">
        {OUTILS.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={actif === o.id}
            aria-controls={`panneau-${o.id}`}
            id={`onglet-${o.id}`}
            type="button"
            onClick={() => setActif(o.id)}
            className="onglet"
          >
            {o.nom}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panneau-${courant.id}`}
        aria-labelledby={`onglet-${courant.id}`}
        className="px-4 sm:px-6 py-6"
      >
        {courant.rendu()}
      </div>
    </div>
  )
}
