import Link from "next/link";

type RecommendationCardProps = {
  actionHref: string;
  actionLabel: string;
  body: string;
  impactBadgeClass?: string;
  impactLabel?: string;
  titleBadgeClass: string;
  title: string;
};

export function RecommendationCard({
  actionHref,
  actionLabel,
  body,
  impactBadgeClass,
  impactLabel,
  titleBadgeClass,
  title,
}: RecommendationCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      {impactLabel ? (
        <p
          className={`mb-3 flex w-fit max-w-full rounded-[10px] px-3 py-1.5 text-xs font-semibold leading-5 ${impactBadgeClass}`}
        >
          {impactLabel}
        </p>
      ) : null}
      <h3
        className={`inline-flex max-w-full rounded-[10px] px-3 py-1.5 text-sm font-medium leading-5 ${titleBadgeClass}`}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">{body}</p>

      <div className="mt-4 flex justify-end">
        <Link
          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}
