import { CONTACT_EMAIL } from "@/lib/types";

const PARAGRAPHS = [
  "Ferñent n'est pas une vitrine institutionnelle. C'est l'organe d'un courant politique qui affirme : union libre des peuples libres d'Afrique ; solidarité internationaliste des travailleurs.",
  "Nous publions des enquêtes, des analyses et des récits de luttes. Nous refusons la neutralité de façade qui, dans les rédactions dominantes, consiste à épouser le point de vue des créanciers, des ministères et des rédactions lointaines.",
  "Ce site est volontairement léger : lisible sur un téléphone à bas débit, imprimable, partageable. Les rubriques — Sénégal, Afrique, International, Économie, Social — ne sont pas des silos marketing. Elles sont des portes d'entrée vers le même conflit : qui produit, qui possède, qui décide.",
];

const CLOSING =
  "Proposez un texte, un témoignage, une correction. Un journal vivant se construit avec ses lecteurs — et avec ceux qui n'ont pas encore le droit à la parole.";

export function AboutNotreJournal({
  title = "Ce que veut dire Ferñent",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  return (
    <article className={`prose-editorial max-w-3xl ${className}`}>
      <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">
        {title}
      </h3>
      <div className="mt-4 space-y-4 text-[0.95rem] sm:text-base leading-relaxed text-ink/90">
        {PARAGRAPHS.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
        <p>
          Écrivez-nous :{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-fernent-red underline decoration-fernent-red/40 underline-offset-2 hover:decoration-fernent-red"
          >
            {CONTACT_EMAIL}
          </a>
          . {CLOSING}
        </p>
      </div>
    </article>
  );
}
