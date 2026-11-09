// The page shared by the timed word games: category first, then one turn per
// player with a countdown, and a recap of the last turn before the next starts.
import type { ReactNode } from 'react';
import type { AnyGameRules } from '@gaute/games-sdk/logic';
import { gameClient } from '@gaute/games-sdk/react';
import { Awards, Button, Card, Hero, Label, Muted, PackPicker, Page, Scores, Title } from './ui';
import { Countdown, useCountdown } from './countdown';

const { useGame } = gameClient<AnyGameRules>();
export const SECONDS = 60;

type TimedView = {
  packs: { name: string; hint: string }[];
  pack: string | null;
  player: string;
  playing: boolean;
  word: string | null;
  hard: boolean;
  turn: number;
  turns: number;
  turnScore: number;
  recap: { word: string; ok: boolean }[];
  scores: Record<string, number>;
  awards: { title: string; player: string; count: number }[];
};

export type TimedText = {
  pick: string;
  turn: string;
  ready: string;
  instructions: string;
  start: string;
  yes: string;
  no: string;
  guessed: string;
  hard: string;
  lastTurn: string;
  scores: string;
  titles: string;
  award: (key: string) => string;
  translate: (text: string) => string;
  /** Shown instead of the word, for players who may not see it. */
  hidden?: ReactNode;
};

export function TimedPage({
  text,
  onPick,
  onStart,
  onYes,
  onNo,
  onTimeUp,
}: {
  text: TimedText;
  onPick: (index: number) => void;
  onStart: () => void;
  onYes: () => void;
  onNo: () => void;
  onTimeUp: () => void;
}) {
  const { view: raw, playing } = useGame();
  const view = raw as TimedView;
  const left = useCountdown(SECONDS, view.playing && playing, onTimeUp);
  if (!view.pack)
    return (
      <Page translate={text.translate}>
        <PackPicker heading={text.pick} packs={view.packs} onPick={onPick} />
      </Page>
    );
  if (!view.playing) {
    const anyScore = Object.values(view.scores).some(Boolean);
    return (
      <Page
        translate={text.translate}
        actions={
          playing ? (
            <Button primary onClick={onStart}>
              {text.start}
            </Button>
          ) : null
        }
        below={
          <>
            {view.recap.length ? (
              <Card>
                <Label>{text.lastTurn}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {view.recap.map((item, index) => (
                    <span
                      key={index}
                      className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                        item.ok
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground line-through'
                      }`}
                    >
                      {item.word}
                    </span>
                  ))}
                </div>
              </Card>
            ) : null}
            {anyScore ? (
              <Card>
                <Label>{text.scores}</Label>
                <Scores scores={view.scores} />
              </Card>
            ) : null}
            {playing ? null : (
              <Awards awards={view.awards} heading={text.titles} title={text.award} />
            )}
          </>
        }
      >
        <Hero>
          <Label>
            {view.pack} · {text.turn}
          </Label>
          <Title>{text.ready}</Title>
          <Muted>{text.instructions}</Muted>
        </Hero>
      </Page>
    );
  }
  return (
    <Page
      translate={text.translate}
      actions={
        <div className="grid grid-cols-2 gap-2">
          <Button className="min-h-16 text-lg" onClick={onNo}>
            {text.no}
          </Button>
          <Button primary className="min-h-16 text-lg" onClick={onYes}>
            {text.yes}
          </Button>
        </div>
      }
    >
      <Countdown left={left} total={SECONDS} />
      <Hero className="py-14">
        {view.word ? (
          <>
            {view.hard ? (
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wide text-primary-foreground uppercase">
                {text.hard}
              </span>
            ) : null}
            <p className="text-5xl leading-tight font-bold tracking-tight text-balance break-words">
              {view.word}
            </p>
          </>
        ) : (
          text.hidden
        )}
        <Muted>{text.guessed}</Muted>
      </Hero>
    </Page>
  );
}
