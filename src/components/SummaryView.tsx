"use client";

import { Highlight } from "./Highlight";
import { prettyMath } from "@/lib/latex";
import type { DeepPartial, Summary } from "@/lib/schemas";

type Props = {
  summary: DeepPartial<Summary> | Summary;
  streaming: boolean;
};

export function SummaryView({ summary, streaming }: Props) {
  const sections = (summary.sections ?? []).filter(Boolean);
  const meta = [summary.subject, summary.level].filter(Boolean).join(" · ");

  return (
    <article className="pb-24">
      <header className="border-b border-encre pb-5">
        {meta ? <p className="text-sm text-encre-clair">{meta}</p> : null}
        <h1 className="titre mt-2 text-titre leading-[1.06]">
          {summary.title ?? <span className="text-photocopie">Lecture en cours…</span>}
        </h1>
      </header>

      {sections.map((section, index) => (
        <section key={index} className="mt-10 lg:grid lg:grid-cols-[minmax(0,62ch)_15rem] lg:gap-10">
          <div className="colonne">
            <h2 className="titre text-lg leading-tight sm:text-xl">{section?.heading}</h2>

            {(section?.paragraphs ?? []).map((paragraph, p) => (
              <p key={p} className="lecture mt-3">
                {paragraph}
              </p>
            ))}

            {(section?.formulas ?? []).map((formula, f) => (
              <div key={f} className="mt-5">
                <p className="titre text-lg">
                  <Highlight seed={`f${index}${f}`}>{prettyMath(formula?.latex ?? "")}</Highlight>
                </p>
                {formula?.meaning ? (
                  <p className="lecture mt-2 text-[0.95rem] italic text-encre-clair">
                    {formula.meaning}
                  </p>
                ) : null}
              </div>
            ))}

            {/* sous 1024 px, les termes clés reprennent leur place dans le flux */}
            <dl className="mt-5 lg:hidden">
              {(section?.keyTerms ?? []).map((term, t) => (
                <div key={t} className="mt-3 border-l-2 border-stabilo-jaune pl-3">
                  <dt className="titre text-[0.95rem]">{term?.term}</dt>
                  <dd className="lecture text-[0.98rem]">{term?.definition}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="hidden lg:block">
            <dl className="sticky top-6">
              {(section?.keyTerms ?? []).map((term, t) => (
                <div key={t} className="mb-5">
                  <dt className="titre text-[0.9rem] leading-snug">{term?.term}</dt>
                  <dd className="lecture mt-1 text-[0.9rem] leading-relaxed text-encre-clair">
                    {term?.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>
      ))}

      {(summary.keyPoints ?? []).length > 0 ? (
        <section className="mt-12 border-t border-encre pt-6">
          <h2 className="titre text-lg">
            <Highlight seed="retenir">À retenir</Highlight>
          </h2>
          <ul className="colonne mt-4">
            {(summary.keyPoints ?? []).map((point, index) => (
              <li key={index} className="lecture mt-2 flex gap-3">
                <span aria-hidden className="mt-[0.55em] h-px w-4 shrink-0 bg-encre" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(summary.commonMistakes ?? []).length > 0 ? (
        <section className="mt-10">
          <h2 className="titre text-lg">
            <Highlight color="rose" seed="pieges">
              Pièges classiques
            </Highlight>
          </h2>
          <ul className="colonne mt-4">
            {(summary.commonMistakes ?? []).map((mistake, index) => (
              <li key={index} className="lecture mt-2 flex gap-3">
                <span aria-hidden className="mt-[0.55em] h-px w-4 shrink-0 bg-encre" />
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {streaming ? (
        <p className="mt-8 text-sm text-encre-clair" role="status">
          <span className="inline-block h-[1em] w-[0.55em] translate-y-[0.12em] bg-encre" /> j&apos;écris
          la suite…
        </p>
      ) : null}
    </article>
  );
}
