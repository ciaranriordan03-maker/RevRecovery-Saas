import { Button } from "../button";

type RecommendationCardProps = {
  action: string;
  body: string;
  titleBadgeClass: string;
  title: string;
};

export function RecommendationCard({
  action,
  body,
  titleBadgeClass,
  title,
}: RecommendationCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <h3
        className={`inline-flex max-w-full rounded-[10px] px-3 py-1.5 text-sm font-medium leading-5 ${titleBadgeClass}`}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">{body}</p>

      <div className="mt-4 flex justify-end gap-3">
        <Button className="h-9 px-4 text-sm" variant="secondary">
          Dismiss
        </Button>
        <Button className="h-9 px-4 text-sm">{action}</Button>
      </div>
    </article>
  );
}
