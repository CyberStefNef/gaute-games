// Small building blocks shared by the official games, styled with the app's
// theme through Tailwind. Creators are free to use anything else.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { AnyGameRules } from '@gaute/games-sdk/logic';
import { gameClient } from '@gaute/games-sdk/react';

// These parts work in any game, so they only use what every game has.
const { useGame } = gameClient<AnyGameRules>();

/** The page, with the reason the last action was rejected underneath. */
export function Page({
  children,
  translate,
}: {
  children: ReactNode;
  /** Translates the rules' rejection reasons: pass `t.text` from `useStrings`. */
  translate: (text: string) => string;
}) {
  const { rejected } = useGame();
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-4 p-4 text-base leading-snug">
      {children}
      {rejected ? (
        <p role="alert" className="font-semibold text-destructive">
          {translate(rejected)}
        </p>
      ) : null}
    </main>
  );
}

export const Card = ({ children }: { children: ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-card-foreground">
    {children}
  </section>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <p className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
    {children}
  </p>
);

export const Big = ({ children }: { children: ReactNode }) => (
  <p className="text-[28px] leading-tight font-bold break-words">{children}</p>
);

export const Muted = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground">{children}</p>
);

/** A full-width button; `primary` for the main action, `pressed` for a chosen option. */
export function Button({
  primary,
  pressed,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; pressed?: boolean }) {
  const { busy } = useGame();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={busy || props.disabled}
      className={`min-h-12 rounded-lg border px-4 py-2.5 font-semibold disabled:opacity-55 ${
        primary
          ? 'border-primary bg-primary text-center text-primary-foreground'
          : 'border-border bg-card text-left text-card-foreground'
      } ${pressed ? 'border-primary shadow-[inset_0_0_0_2px_var(--primary)]' : ''} ${className}`}
      {...props}
    />
  );
}

/** One button per player, for votes and accusations. */
export function PlayerChoice({
  handles,
  chosen,
  onChoose,
}: {
  handles: string[];
  chosen: string | null;
  onChoose: (handle: string) => void;
}) {
  const { name, playing } = useGame();
  return (
    <div className="flex flex-col gap-2">
      {handles.map((handle) => (
        <Button
          key={handle}
          pressed={chosen === handle}
          disabled={!playing}
          onClick={() => onChoose(handle)}
        >
          {name(handle)}
        </Button>
      ))}
    </div>
  );
}

/** Vote counts as bars, highest first. */
export function Tally({ counts }: { counts: Record<string, number> }) {
  const { name } = useGame();
  const most = Math.max(1, ...Object.values(counts));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([handle, count]) => (
      <div key={handle} className="flex items-center justify-between gap-3">
        <span>{name(handle)}</span>
        <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
          <div className="h-2 rounded bg-primary" style={{ width: `${(count / most) * 100}%` }} />
        </div>
        <strong>{count}</strong>
      </div>
    ));
}
