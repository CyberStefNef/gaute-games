// Building blocks shared by the official games, styled with the app's theme
// through Tailwind. Creators are free to use anything else.
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { AnyGameRules } from '@gaute/games-sdk/logic';
import { gameClient } from '@gaute/games-sdk/react';

// These parts work in any game, so they only use what every game has.
const { useGame } = gameClient<AnyGameRules>();

/**
 * A screen laid out like the app's own: the main card centred in the space,
 * secondary details (`below`) just above the actions, and the actions pinned to
 * the bottom with the reason the last action was rejected above them.
 */
export function Page({
  children,
  below,
  actions,
  translate,
}: {
  children: ReactNode;
  below?: ReactNode;
  actions?: ReactNode;
  /** Translates the rules' rejection reasons: pass `t.text` from `useStrings`. */
  translate: (text: string) => string;
}) {
  const { rejected } = useGame();
  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col text-base leading-snug">
      <div className="flex flex-1 flex-col justify-center gap-4 px-5 py-8">{children}</div>
      {below ? <div className="flex flex-col gap-3 px-5 pb-4">{below}</div> : null}
      {actions || rejected ? (
        <div className="sticky bottom-0 flex flex-col gap-2 bg-background px-5 pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">
          {rejected ? (
            <p role="alert" className="text-center text-sm font-medium text-destructive">
              {translate(rejected)}
            </p>
          ) : null}
          {actions}
        </div>
      ) : null}
    </main>
  );
}

/** The screen's main card: centred, roomy, like a card on the table. */
export const Hero = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section
    className={`flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-10 text-center text-card-foreground ${className}`}
  >
    {children}
  </section>
);

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section
    className={`flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-card-foreground ${className}`}
  >
    {children}
  </section>
);

/** A small heading line, with optional text on the right. */
export const Label = ({ children, aside }: { children: ReactNode; aside?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
    <span>{children}</span>
    {aside ? <span className="font-medium tracking-normal normal-case">{aside}</span> : null}
  </div>
);

export const Title = ({ children, large }: { children: ReactNode; large?: boolean }) => (
  <h1
    className={`${large ? 'text-[34px]' : 'text-[26px]'} leading-tight min-w-0 max-w-full font-bold tracking-tight text-balance wrap-anywhere`}
  >
    {children}
  </h1>
);

export const Muted = ({ children }: { children: ReactNode }) => (
  <p className="text-[15px] text-muted-foreground">{children}</p>
);

/** A full-width button; `primary` for the main action. */
export function Button({
  primary,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  const { busy } = useGame();
  return (
    <button
      type="button"
      disabled={busy || props.disabled}
      className={`min-h-12 rounded-xl px-4 font-semibold transition-opacity active:opacity-70 disabled:opacity-50 ${
        primary
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card text-card-foreground'
      } ${className}`}
      {...props}
    />
  );
}

/** One row per player, for votes and accusations; the chosen one is marked. */
export function PlayerChoice({
  handles,
  chosen,
  onChoose,
}: {
  handles: string[];
  chosen: string | null;
  onChoose: (handle: string) => void;
}) {
  const { name, playing, busy } = useGame();
  return (
    <div className="flex w-full flex-col gap-2">
      {handles.map((handle) => {
        const selected = chosen === handle;
        return (
          <button
            key={handle}
            type="button"
            aria-pressed={selected}
            disabled={busy || !playing}
            onClick={() => onChoose(handle)}
            className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left font-medium transition-colors disabled:opacity-60 ${
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground active:bg-muted'
            }`}
          >
            {name(handle)}
            {selected ? <Check /> : null}
          </button>
        );
      })}
    </div>
  );
}

const Check = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** Counts per player as bars, highest first. */
export function Tally({ counts }: { counts: Record<string, number> }) {
  const { name } = useGame();
  const most = Math.max(1, ...Object.values(counts));
  return (
    <div className="flex w-full flex-col gap-2.5 text-left">
      {Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([handle, count]) => (
          <div
            key={handle}
            className="grid grid-cols-[minmax(0,7rem)_1fr_1.5rem] items-center gap-3"
          >
            <span className="truncate">{name(handle)}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(count / most) * 100}%` }}
              />
            </div>
            <strong className="text-right tabular-nums">{count}</strong>
          </div>
        ))}
    </div>
  );
}

/** Players with their points, highest first. */
export function Scores({
  scores,
  gains,
}: {
  scores: Record<string, number>;
  gains?: Record<string, number>;
}) {
  const { name } = useGame();
  return (
    <div className="flex flex-col divide-y divide-border">
      {Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([handle, score]) => (
          <div key={handle} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <span>{name(handle)}</span>
            <span className="flex shrink-0 items-center gap-3 tabular-nums">
              {gains ? <span className="text-primary">+{gains[handle] ?? 0}</span> : null}
              <strong>{score}</strong>
            </span>
          </div>
        ))}
    </div>
  );
}

/** Text with `{p1}`/`{p2}` replaced by highlighted player names. */
export function NamedText({ text, refs }: { text: string; refs: Record<string, string> }) {
  const { name } = useGame();
  return text.split(/(\{p[12]\})/).map((part, index) => {
    const player = /^\{p[12]\}$/.test(part) ? refs[part.slice(1, -1)] : undefined;
    return player ? (
      <span key={index} className="text-primary">
        {name(player)}
      </span>
    ) : (
      part
    );
  });
}

/** End-of-game awards: a funny title per player, from the game's statistics. */
export function Awards({
  awards,
  heading,
  title,
}: {
  awards: { title: string; player: string; count: number }[];
  heading: string;
  /** The award's display name, from its key. */
  title: (key: string) => string;
}) {
  const { name } = useGame();
  if (!awards.length) return null;
  return (
    <Card>
      <Label>{heading}</Label>
      <div className="flex flex-col divide-y divide-border">
        {awards.map((award) => (
          <div
            key={award.title}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="font-semibold">{title(award.title)}</span>
            <span className="text-muted-foreground">{name(award.player)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Start with a mixed deck; themed packs are optional. */
export function PackPicker({
  heading,
  packs,
  onPick,
  play,
  defaultIndex,
}: {
  play: string;
  defaultIndex: number;
  heading: string;
  packs: { name: string; hint: string }[];
  onPick: (index: number) => void;
}) {
  const { busy, playing } = useGame();
  const [expanded, setExpanded] = useState(false);
  return (
    <Hero>
      <Button primary disabled={!playing} onClick={() => onPick(defaultIndex)}>
        {play}
      </Button>
      <button
        type="button"
        className="min-h-11 px-3 text-sm text-primary"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {heading}
      </button>
      {expanded ? (
        <div className="flex w-full flex-col gap-2">
          {packs.map((pack, index) => (
            <button
              key={pack.name}
              type="button"
              disabled={busy || !playing}
              onClick={() => onPick(index)}
              className="flex flex-col gap-0.5 rounded-xl border-2 border-border bg-background px-4 py-3 text-left active:border-primary disabled:opacity-60"
            >
              <span className="text-lg font-bold">{pack.name}</span>
              <span className="text-sm text-muted-foreground">{pack.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </Hero>
  );
}
