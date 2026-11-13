import { strings } from './strings';
import { useEffect, useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { CourseMap, formatToPar, Mark } from './course';
import { Awards, Button, Card, Hero, Label, Muted, Page, PlayerChoice, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const STYLE_CHOICES = [
  { name: 'Any drink', hint: 'Water or a soft drink counts the same.' },
  { name: 'Classic beer golf', hint: 'Finish your beer in the par number of sips.' },
  { name: 'Challenge golf', hint: 'Quick tasks, no drinking. Strokes are tries.' },
] as const;
const HOLE_CHOICES = [3, 6, 9];

function Game() {
  const { view, players, name, act, playing, busy, you, gaute, haptic } = useGame();
  const t = useStrings(strings);
  const shared = view.mode === 'shared';
  const unit = view.style === 'challenge' ? t('Tries') : t('Sips');
  const max = view.par + view.maxOver;
  const [value, setValue] = useState(view.par);
  const [who, setWho] = useState<string | null>(null);
  const [stops, setStops] = useState<string[]>(view.customStops);
  const [naming, setNaming] = useState(false);

  // Each hole starts from par, and a shared screen starts from nobody chosen.
  useEffect(() => {
    setValue(view.par);
    setWho(null);
  }, [view.at, view.par]);

  const present = players.filter((player) => !player.left);
  const handles = present.map((player) => player.handle);
  const results = Object.entries(view.toPar).sort((a, b) => a[1] - b[1]);
  const last = view.at + 1 >= view.total;
  const here = view.card;
  const strokesNow = (player: string) => here[player]?.[view.at];

  // The hole's best score gets a little celebration.
  useEffect(() => {
    if (!view.revealed || !you) return;
    const mine = strokesNow(you);
    const best = Math.min(...handles.map((p) => strokesNow(p) ?? Infinity));
    if (typeof mine === 'number' && mine === best && mine <= view.par) gaute('celebrate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.revealed, view.at]);

  const label = (strokes: number | null | undefined) => {
    if (strokes === undefined) return '';
    if (strokes === null) return t('Skipped');
    const diff = strokes - view.par;
    if (strokes === 1) return t('Hole in one');
    if (diff <= -2) return t('Eagle');
    if (diff === -1) return t('Birdie');
    if (diff === 0) return t('Par');
    if (diff === 1) return t('Bogey');
    if (diff === 2) return t('Double bogey');
    return t('Over par');
  };

  const report = async (strokes: number) => {
    const target = shared ? who : null;
    if (shared && !target) return;
    const result = await act('submit', { value: strokes, target });
    if (result.ok) {
      haptic('success');
      if (shared) setWho(null);
    }
  };

  const scorecard = view.started ? (
    <Card>
      <Label>{t('Scorecard')}</Label>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-center text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-2 py-1 text-left font-medium"> </th>
              {view.pars.map((par, hole) => (
                <th key={hole} className="px-1.5 py-1 font-medium">
                  {hole + 1}
                  <span className="block text-xs font-normal">{par}</span>
                </th>
              ))}
              <th className="px-2 py-1 font-semibold">{t('Total')}</th>
            </tr>
          </thead>
          <tbody>
            {handles.map((player) => (
              <tr key={player} className="border-t border-border">
                <td className="max-w-28 truncate px-2 py-1.5 text-left font-medium">
                  {name(player)}
                </td>
                {view.pars.map((par, hole) => (
                  <td key={hole} className="px-1 py-1.5">
                    <Mark strokes={here[player]?.[hole]} par={par} />
                  </td>
                ))}
                <td className="px-2 py-1.5 font-bold">{formatToPar(view.toPar[player] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  ) : null;

  if (!view.started) {
    const choose = (index: number) => act('setStyle', { value: index });
    return (
      <Page
        translate={t.text}
        actions={
          playing ? (
            view.isHost ? (
              <Button primary onClick={() => act('start')}>
                {t('Tee off')}
              </Button>
            ) : (
              <Muted>{t('Only the host can start the round.')}</Muted>
            )
          ) : null
        }
      >
        <Hero>
          <Label>{t('Choose your rules')}</Label>
          <div className="grid w-full gap-2 text-left">
            {STYLE_CHOICES.map((choice, index) => {
              const picked = ['any', 'classic', 'challenge'][index] === view.style;
              return (
                <button
                  key={choice.name}
                  type="button"
                  aria-pressed={picked}
                  disabled={!view.isHost || busy || !playing}
                  onClick={() => choose(index)}
                  className={`flex min-h-14 flex-col justify-center rounded-xl border-2 px-4 py-2 disabled:opacity-80 ${
                    picked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  <span className="font-bold">{t(choice.name)}</span>
                  <span className="text-sm opacity-80">{t(choice.hint)}</span>
                </button>
              );
            })}
          </div>
          <Label>{t('Holes')}</Label>
          <div className="grid w-full grid-cols-3 gap-2">
            {HOLE_CHOICES.map((count, index) => (
              <button
                key={count}
                type="button"
                aria-pressed={view.holeCount === count}
                disabled={!view.isHost || busy || !playing}
                onClick={() => act('setHoles', { value: index })}
                className={`min-h-12 rounded-xl border-2 text-lg font-bold disabled:opacity-80 ${
                  view.holeCount === count
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          {view.isHost ? (
            <button
              type="button"
              aria-expanded={naming}
              className="min-h-11 px-3 text-sm text-primary"
              onClick={() => setNaming(!naming)}
            >
              {t('Name your stops')}
            </button>
          ) : null}
          {naming ? (
            <div className="grid w-full gap-2">
              {Array.from({ length: view.holeCount }, (_, hole) => (
                <input
                  key={hole}
                  value={stops[hole] ?? ''}
                  maxLength={30}
                  placeholder={view.stops[hole]}
                  aria-label={t('Stop {n}', { n: hole + 1 })}
                  onChange={(event) =>
                    setStops(stops.map((s, i) => (i === hole ? event.target.value : s)))
                  }
                  onBlur={() => act('rename', { hole, text: stops[hole] ?? '' })}
                  className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
                />
              ))}
            </div>
          ) : null}
          <Muted>{t('Pace yourself, skip any hole, and have some water.')}</Muted>
        </Hero>
      </Page>
    );
  }

  if (!playing) {
    return (
      <Page translate={t.text}>
        <Hero>
          <Label>{t('Results')}</Label>
          <div className="flex w-full flex-col divide-y divide-border text-left">
            {results.map(([player, total], index) => (
              <div key={player} className="flex items-center justify-between py-2.5">
                <span className={index === 0 ? 'font-bold' : ''}>
                  {index + 1}. {name(player)}
                </span>
                <strong className="tabular-nums">{formatToPar(total)}</strong>
              </div>
            ))}
          </div>
        </Hero>
        <Awards awards={view.awards} heading={t('Titles')} title={(key) => t.text(key)} />
        {scorecard}
      </Page>
    );
  }

  const mine = you ? view.yourStrokes : null;
  const chosen = shared ? who : you;
  const reportedCount = view.reported.length;
  const reportedHere = chosen ? view.reported.includes(chosen) : false;
  return (
    <Page
      translate={t.text}
      below={scorecard}
      actions={
        view.revealed ? (
          <Button primary onClick={() => act('next')}>
            {last ? t('See results') : t('Next hole')}
          </Button>
        ) : reportedCount > 0 ? (
          <Button onClick={() => act('reveal')}>{t('Reveal now')}</Button>
        ) : null
      }
    >
      <Hero>
        <CourseMap total={view.total} at={view.at} revealed={view.revealed} stops={view.stops} />
        <Label aside={t('Par {n}', { n: view.par })}>
          {t('Hole {n} of {total}', { n: view.at + 1, total: view.total })}
        </Label>
        <Title>{view.stops[view.at]}</Title>
        <p className="text-balance text-muted-foreground">{view.rule}</p>

        {view.revealed ? (
          <div className="flex w-full flex-col divide-y divide-border text-left">
            {handles.map((player) => (
              <div key={player} className="flex items-center justify-between gap-3 py-2">
                <span>{name(player)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{label(strokesNow(player))}</span>
                  <Mark strokes={strokesNow(player)} par={view.par} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {shared ? (
              <>
                <Label>{t('Who is reporting?')}</Label>
                <PlayerChoice handles={handles} chosen={who} onChoose={setWho} />
              </>
            ) : null}
            <Label>{unit}</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label={t('Fewer strokes')}
                disabled={value <= 1}
                onClick={() => setValue(value - 1)}
                className="size-14 rounded-full border-2 border-border text-3xl font-bold disabled:opacity-40"
              >
                −
              </button>
              <span className="w-16 text-5xl font-bold tabular-nums">{value}</span>
              <button
                type="button"
                aria-label={t('More strokes')}
                disabled={value >= max}
                onClick={() => setValue(value + 1)}
                className="size-14 rounded-full border-2 border-border text-3xl font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>
            <div className="grid w-full gap-2">
              <Button primary disabled={!playing || (shared && !who)} onClick={() => report(value)}>
                {reportedHere || (!shared && mine !== null) ? t('Update') : t('Report')}
              </Button>
              <Button disabled={!playing || (shared && !who)} onClick={() => report(0)}>
                {t('Skip hole')}
              </Button>
            </div>
            <Muted>
              {t('{count} of {total} reported', { count: reportedCount, total: handles.length })}
            </Muted>
          </>
        )}
        {view.revealed && view.style !== 'challenge' ? (
          <Muted>{t('Take a sip of water if you like.')}</Muted>
        ) : null}
        {results[0] && view.revealed ? (
          <p className="text-sm text-muted-foreground">
            {name(results[0][0])} · {formatToPar(results[0][1])}
          </p>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
