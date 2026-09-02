"use client";

import { useState } from "react";
import { Highlight } from "./Highlight";
import { REVIEW_OFFSETS_DAYS } from "@/lib/data-model";

/**
 * Le travail est déjà fait et déjà affiché quand ce bloc apparaît. On ne demande
 * rien avant. Et on ne fait pas semblant d'avoir des comptes : la phase 1 n'en a
 * pas, on le dit, et on propose ce qui existe vraiment.
 */
export function KeepWork({ cardCount }: { cardCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-10 border-t-2 border-encre pt-6">
      <h2 className="titre text-titre leading-tight">
        <Highlight seed="garder">Garder mes fiches</Highlight>
      </h2>
      <p className="lecture colonne mt-3">
        Ces {cardCount} fiches sont à toi. Sans compte, elles vivent le temps de cet onglet :
        télécharge-les maintenant, ou reconvertis le même cours plus tard, c&apos;est instantané et
        hors quota.
      </p>

      <button type="button" className="bouton mt-4" onClick={() => setOpen((value) => !value)}>
        {open ? "Replier" : "Ce qu'un compte changera"}
      </button>

      {open ? (
        <div className="colonne mt-4 border border-encre p-4">
          <p className="lecture">
            Un compte, en phase 2, sert à une seule chose : te faire revenir au bon moment. La
            mémoire décroche vite après une première lecture, et trois passages courts espacés
            battent une longue session. Le produit te reproposera donc ce paquet à{" "}
            {REVIEW_OFFSETS_DAYS.map((day, index) => (
              <span key={day}>
                {index > 0 ? (index === REVIEW_OFFSETS_DAYS.length - 1 ? " et " : ", ") : ""}J+
                {day}
              </span>
            ))}
            , en remettant devant les fiches que tu n&apos;as pas sues.
          </p>
          <p className="lecture mt-3">
            Viennent avec : l&apos;historique, le lien de partage pour ta classe, l&apos;envoi vers
            Notion, et les planches d&apos;impression sans filigrane. Rien de tout ça n&apos;est
            branché aujourd&apos;hui — la phase 1 s&apos;arrête à la conversion, et elle est
            gratuite.
          </p>
        </div>
      ) : null}
    </section>
  );
}
