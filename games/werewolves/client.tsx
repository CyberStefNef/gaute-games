import type { ViewOf } from '@gaute/games-sdk/logic';
import { gameClient, useStrings, type Translate } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Card, Hero, Label, Muted, Page, PlayerChoice, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
type View = ViewOf<typeof game>;

const en = {
  wolf: 'Werewolf',
  seer: 'Seer',
  doctor: 'Doctor',
  villager: 'Villager',
  'Night {n}': 'Night {n}',
  'Day {n}': 'Day {n}',
  'You are the {role}': 'You are the {role}',
  'Choose tonight’s victim': 'Choose tonight’s victim',
  'Other werewolves: {names}': 'Other werewolves: {names}',
  '{name} chose {target}': '{name} chose {target}',
  'Who do you want to check?': 'Who do you want to check?',
  'Who do you protect tonight?': 'Who do you protect tonight?',
  'Night falls. Close your eyes and wait.': 'Night falls. Close your eyes and wait.',
  '{name} is a werewolf!': '{name} is a werewolf!',
  '{name} is not a werewolf.': '{name} is not a werewolf.',
  '{name} was taken in the night.': '{name} was taken in the night.',
  'Nobody died: the doctor saved them.': 'Nobody died: the doctor saved them.',
  '{name} was voted out. They were the {role}.': '{name} was voted out. They were the {role}.',
  'No one was voted out.': 'No one was voted out.',
  '{name} left. They were the {role}.': '{name} left. They were the {role}.',
  'Who do you vote out?': 'Who do you vote out?',
  Nobody: 'Nobody',
  '{count} of {total} voted': '{count} of {total} voted',
  'Waiting for the others…': 'Waiting for the others…',
  'You are out. Watch quietly.': 'You are out. Watch quietly.',
  'The village wins!': 'The village wins!',
  'The werewolves win!': 'The werewolves win!',
  'Only werewolves hunt at night.': 'Only werewolves hunt at night.',
  'Choose someone in the village.': 'Choose someone in the village.',
  'Only the seer looks at night.': 'Only the seer looks at night.',
  'You already looked tonight.': 'You already looked tonight.',
  'Choose someone else who is alive.': 'Choose someone else who is alive.',
  'Only the doctor protects at night.': 'Only the doctor protects at night.',
  'Choose someone who is alive.': 'Choose someone who is alive.',
  'Only the living vote by day.': 'Only the living vote by day.',
  'Choose a player in this game.': 'Choose a player in this game.',
} as const;
const nb: Record<keyof typeof en, string> = {
  wolf: 'Varulv',
  seer: 'Spåkone',
  doctor: 'Lege',
  villager: 'Landsbyboer',
  'Night {n}': 'Natt {n}',
  'Day {n}': 'Dag {n}',
  'You are the {role}': 'Du er {role}',
  'Choose tonight’s victim': 'Velg nattens offer',
  'Other werewolves: {names}': 'Andre varulver: {names}',
  '{name} chose {target}': '{name} valgte {target}',
  'Who do you want to check?': 'Hvem vil du sjekke?',
  'Who do you protect tonight?': 'Hvem beskytter du i natt?',
  'Night falls. Close your eyes and wait.': 'Natten faller på. Lukk øynene og vent.',
  '{name} is a werewolf!': '{name} er en varulv!',
  '{name} is not a werewolf.': '{name} er ikke en varulv.',
  '{name} was taken in the night.': '{name} ble tatt i natt.',
  'Nobody died: the doctor saved them.': 'Ingen døde: legen reddet dem.',
  '{name} was voted out. They were the {role}.': '{name} ble stemt ut. Rollen var {role}.',
  'No one was voted out.': 'Ingen ble stemt ut.',
  '{name} left. They were the {role}.': '{name} gikk. Rollen var {role}.',
  'Who do you vote out?': 'Hvem stemmer du ut?',
  Nobody: 'Ingen',
  '{count} of {total} voted': '{count} av {total} har stemt',
  'Waiting for the others…': 'Venter på de andre …',
  'You are out. Watch quietly.': 'Du er ute. Se på i stillhet.',
  'The village wins!': 'Landsbyen vinner!',
  'The werewolves win!': 'Varulvene vinner!',
  'Only werewolves hunt at night.': 'Bare varulver jakter om natten.',
  'Choose someone in the village.': 'Velg noen i landsbyen.',
  'Only the seer looks at night.': 'Bare spåkona ser om natten.',
  'You already looked tonight.': 'Du har allerede sett i natt.',
  'Choose someone else who is alive.': 'Velg en annen som lever.',
  'Only the doctor protects at night.': 'Bare legen beskytter om natten.',
  'Choose someone who is alive.': 'Velg noen som lever.',
  'Only the living vote by day.': 'Bare de levende stemmer om dagen.',
  'Choose a player in this game.': 'Velg en spiller i dette spillet.',
};
type T = Translate<typeof en>;

function News({ view, t }: { view: View; t: T }) {
  const { name } = useGame();
  const latest = view.events.filter((event) => event.round >= view.round - 1).slice(-2);
  if (!latest.length) return null;
  return (
    <Card>
      {latest.map((event, index) => (
        <p key={index}>
          {event.kind === 'killed'
            ? t('{name} was taken in the night.', { name: name(event.player) })
            : event.kind === 'saved'
              ? t('Nobody died: the doctor saved them.')
              : event.kind === 'voted'
                ? t('{name} was voted out. They were the {role}.', {
                    name: name(event.player),
                    role: t(event.role),
                  })
                : event.kind === 'left'
                  ? t('{name} left. They were the {role}.', {
                      name: name(event.player),
                      role: t(event.role),
                    })
                  : t('No one was voted out.')}
        </p>
      ))}
    </Card>
  );
}

function Game() {
  const { view, you, name, act, playing, busy } = useGame();
  const t = useStrings({ en, nb });
  const when =
    view.phase === 'night' ? t('Night {n}', { n: view.round }) : t('Day {n}', { n: view.round });
  const others = view.living.filter((player) => player !== you);

  if (view.winner)
    return (
      <Page translate={t.text}>
        <Hero>
          <Title large>
            {view.winner === 'village' ? t('The village wins!') : t('The werewolves win!')}
          </Title>
          <div className="flex w-full flex-col divide-y divide-border text-left">
            {Object.entries(view.roles).map(([player, role]) => (
              <div key={player} className="flex justify-between py-2">
                <span>{name(player)}</span>
                <strong>{t(role)}</strong>
              </div>
            ))}
          </div>
        </Hero>
      </Page>
    );

  const roleLine = view.role ? t('You are the {role}', { role: t(view.role) }) : '';
  let body;
  if (!view.alive)
    body = (
      <Hero>
        <Label>{when}</Label>
        <Title>{t('You are out. Watch quietly.')}</Title>
      </Hero>
    );
  else if (view.todo === 'kill')
    body = (
      <Hero className="border-primary">
        <Label>
          {when} · {roleLine}
        </Label>
        <Title>{t('Choose tonight’s victim')}</Title>
        <PlayerChoice
          handles={others.filter((player) => !view.pack.includes(player))}
          chosen={view.yourChoice}
          onChoose={(target) => act('kill', { target })}
        />
        {view.pack.length ? (
          <Muted>{t('Other werewolves: {names}', { names: view.pack.map(name).join(', ') })}</Muted>
        ) : null}
        {view.pack
          .filter((wolf) => view.packVotes[wolf])
          .map((wolf) => (
            <Muted key={wolf}>
              {t('{name} chose {target}', { name: name(wolf), target: name(view.packVotes[wolf]) })}
            </Muted>
          ))}
      </Hero>
    );
  else if (view.todo === 'inspect' || view.todo === 'protect')
    body = (
      <Hero>
        <Label>
          {when} · {roleLine}
        </Label>
        <Title>
          {view.todo === 'inspect'
            ? t('Who do you want to check?')
            : t('Who do you protect tonight?')}
        </Title>
        <PlayerChoice
          handles={view.todo === 'inspect' ? others : view.living}
          chosen={view.yourChoice}
          onChoose={(target) => act(view.todo === 'inspect' ? 'inspect' : 'protect', { target })}
        />
      </Hero>
    );
  else if (view.todo === 'vote')
    body = (
      <Hero>
        <Label>
          {when} · {roleLine}
        </Label>
        <Title>{t('Who do you vote out?')}</Title>
        <PlayerChoice
          handles={others}
          chosen={view.yourChoice}
          onChoose={(target) => act('vote', { target })}
        />
        <Button disabled={busy || !playing} onClick={() => act('vote', { target: 'nobody' })}>
          {t('Nobody')}
        </Button>
        <Muted>
          {t('{count} of {total} voted', { count: view.votes, total: view.living.length })}
        </Muted>
      </Hero>
    );
  else
    body = (
      <Hero
        className={
          view.phase === 'night' ? 'border-primary bg-primary text-primary-foreground' : ''
        }
      >
        <Label>
          <span className={view.phase === 'night' ? 'text-primary-foreground/80' : ''}>
            {when} · {roleLine}
          </span>
        </Label>
        <Title>
          {view.phase === 'night' && view.role === 'villager'
            ? t('Night falls. Close your eyes and wait.')
            : t('Waiting for the others…')}
        </Title>
        {Object.entries(view.seen).map(([player, wolf]) => (
          <p key={player} className="opacity-85">
            {wolf
              ? t('{name} is a werewolf!', { name: name(player) })
              : t('{name} is not a werewolf.', { name: name(player) })}
          </p>
        ))}
      </Hero>
    );
  return (
    <Page translate={t.text} below={<News view={view} t={t} />}>
      {body}
    </Page>
  );
}

mountGame(Game);
