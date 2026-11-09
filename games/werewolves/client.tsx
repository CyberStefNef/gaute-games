import { useState } from 'react';
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
  witch: 'Witch',
  hunter: 'Hunter',
  villager: 'Villager',
  'Night {n}': 'Night {n}',
  'Day {n}': 'Day {n}',
  'You are the {role}': 'You are the {role}',
  'Choose tonight’s victim': 'Choose tonight’s victim',
  'Other werewolves: {names}': 'Other werewolves: {names}',
  '{name} chose {target}': '{name} chose {target}',
  'Who do you want to check?': 'Who do you want to check?',
  'Who do you protect tonight?': 'Who do you protect tonight?',
  'The werewolves chose {name}': 'The werewolves chose {name}',
  'Save them': 'Save them',
  'Healing potion used': 'Healing potion used',
  'Poison someone?': 'Poison someone?',
  'Poison used': 'Poison used',
  'No poison': 'No poison',
  Done: 'Done',
  'Your last shot: who goes down with you?': 'Your last shot: who goes down with you?',
  'The hunter is taking aim…': 'The hunter is taking aim…',
  'Night falls. Close your eyes and wait.': 'Night falls. Close your eyes and wait.',
  '{name} is a werewolf!': '{name} is a werewolf!',
  '{name} is not a werewolf.': '{name} is not a werewolf.',
  story0: '{name} went out for a late kebab and never came back.',
  story1: '{name} was found at dawn, still holding the TV remote.',
  story2: 'Only {name}’s left shoe was found by the fjord.',
  story3: '{name} answered a knock at midnight. Bad idea.',
  story4: '{name} took a shortcut through the forest.',
  story5: 'The wolves dragged {name} off mid-snore.',
  '{name} drank something that tasted funny.': '{name} drank something that tasted funny.',
  'The village voted out {name}.': 'The village voted out {name}.',
  'The hunter took {name} down.': 'The hunter took {name} down.',
  '{name} left the game.': '{name} left the game.',
  'They were the {role}.': 'They were the {role}.',
  'A quiet night. Nobody died.': 'A quiet night. Nobody died.',
  'No one was voted out.': 'No one was voted out.',
  'Talk it through, then vote.': 'Talk it through, then vote.',
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
  'Only the witch brews at night.': 'Only the witch brews at night.',
  'You already chose tonight.': 'You already chose tonight.',
  'Wait for the werewolves to choose.': 'Wait for the werewolves to choose.',
  'Your healing potion is used up.': 'Your healing potion is used up.',
  'You can’t poison them.': 'You can’t poison them.',
  'Choose what to brew.': 'Choose what to brew.',
  'Only the hunter shoots now.': 'Only the hunter shoots now.',
  'Only the living vote by day.': 'Only the living vote by day.',
  'Choose a player in this game.': 'Choose a player in this game.',
} as const;
const nb: Record<keyof typeof en, string> = {
  wolf: 'Varulv',
  seer: 'Spåkone',
  doctor: 'Lege',
  witch: 'Heks',
  hunter: 'Jeger',
  villager: 'Landsbyboer',
  'Night {n}': 'Natt {n}',
  'Day {n}': 'Dag {n}',
  'You are the {role}': 'Du er {role}',
  'Choose tonight’s victim': 'Velg nattens offer',
  'Other werewolves: {names}': 'Andre varulver: {names}',
  '{name} chose {target}': '{name} valgte {target}',
  'Who do you want to check?': 'Hvem vil du sjekke?',
  'Who do you protect tonight?': 'Hvem beskytter du i natt?',
  'The werewolves chose {name}': 'Varulvene valgte {name}',
  'Save them': 'Redd dem',
  'Healing potion used': 'Helbredelsesdrikken er brukt',
  'Poison someone?': 'Forgifte noen?',
  'Poison used': 'Giften er brukt',
  'No poison': 'Ingen gift',
  Done: 'Ferdig',
  'Your last shot: who goes down with you?': 'Ditt siste skudd: hvem tar du med deg?',
  'The hunter is taking aim…': 'Jegeren sikter …',
  'Night falls. Close your eyes and wait.': 'Natten faller på. Lukk øynene og vent.',
  '{name} is a werewolf!': '{name} er en varulv!',
  '{name} is not a werewolf.': '{name} er ikke en varulv.',
  story0: '{name} gikk ut for en sen kebab og kom aldri tilbake.',
  story1: '{name} ble funnet ved daggry, fortsatt med fjernkontrollen i hånda.',
  story2: 'Bare den venstre skoen til {name} ble funnet ved fjorden.',
  story3: '{name} åpnet døra da det banket ved midnatt. Dårlig idé.',
  story4: '{name} tok en snarvei gjennom skogen.',
  story5: 'Ulvene dro {name} med seg midt i et snork.',
  '{name} drank something that tasted funny.': '{name} drakk noe som smakte rart.',
  'The village voted out {name}.': 'Landsbyen stemte ut {name}.',
  'The hunter took {name} down.': 'Jegeren tok {name} med seg.',
  '{name} left the game.': '{name} forlot spillet.',
  'They were the {role}.': 'Rollen var {role}.',
  'A quiet night. Nobody died.': 'En rolig natt. Ingen døde.',
  'No one was voted out.': 'Ingen ble stemt ut.',
  'Talk it through, then vote.': 'Diskuter, og stem.',
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
  'Only the witch brews at night.': 'Bare heksa brygger om natten.',
  'You already chose tonight.': 'Du har allerede valgt i natt.',
  'Wait for the werewolves to choose.': 'Vent til varulvene har valgt.',
  'Your healing potion is used up.': 'Helbredelsesdrikken er brukt opp.',
  'You can’t poison them.': 'Du kan ikke forgifte dem.',
  'Choose what to brew.': 'Velg hva du vil brygge.',
  'Only the hunter shoots now.': 'Bare jegeren skyter nå.',
  'Only the living vote by day.': 'Bare de levende stemmer om dagen.',
  'Choose a player in this game.': 'Velg en spiller i dette spillet.',
};
type T = Translate<typeof en>;
const STORIES = ['story0', 'story1', 'story2', 'story3', 'story4', 'story5'] as const;

function News({ view, t }: { view: View; t: T }) {
  const { name } = useGame();
  const latest = view.events.filter((event) => event.round >= view.round - 1).slice(-3);
  if (!latest.length) return null;
  return (
    <Card>
      {latest.map((event, index) => {
        if (event.kind === 'quiet') return <p key={index}>{t('A quiet night. Nobody died.')}</p>;
        if (event.kind === 'tie') return <p key={index}>{t('No one was voted out.')}</p>;
        const who = { name: name(event.player) };
        const story =
          event.cause === 'wolves'
            ? t(STORIES[event.story % STORIES.length], who)
            : event.cause === 'poison'
              ? t('{name} drank something that tasted funny.', who)
              : event.cause === 'vote'
                ? t('The village voted out {name}.', who)
                : event.cause === 'hunter'
                  ? t('The hunter took {name} down.', who)
                  : t('{name} left the game.', who);
        return (
          <p key={index}>
            {story}{' '}
            <span className="text-muted-foreground">
              {t('They were the {role}.', { role: t(event.role) })}
            </span>
          </p>
        );
      })}
    </Card>
  );
}

function Brew({ view, t }: { view: View; t: T }) {
  const { you, name, act, busy } = useGame();
  const [save, setSave] = useState(false);
  const [poison, setPoison] = useState<string>('nobody');
  const witch = view.witch!;
  const others = view.living.filter((player) => player !== you);
  return (
    <Hero className="border-primary">
      <Label>{t('You are the {role}', { role: t('witch') })}</Label>
      <Title>{t('The werewolves chose {name}', { name: name(witch.victim ?? '') })}</Title>
      <Button primary={save} disabled={!witch.heal || busy} onClick={() => setSave(!save)}>
        {witch.heal ? t('Save them') : t('Healing potion used')}
      </Button>
      <Muted>{witch.poison ? t('Poison someone?') : t('Poison used')}</Muted>
      {witch.poison ? (
        <>
          <PlayerChoice
            handles={others}
            chosen={poison === 'nobody' ? null : poison}
            onChoose={setPoison}
          />
          <Button primary={poison === 'nobody'} onClick={() => setPoison('nobody')}>
            {t('No poison')}
          </Button>
        </>
      ) : null}
      <Button primary disabled={busy} onClick={() => act('brew', { save, poison })}>
        {t('Done')}
      </Button>
    </Hero>
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
      <Page translate={t.text} below={<News view={view} t={t} />}>
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
  if (view.todo === 'shoot')
    body = (
      <Hero className="border-primary">
        <Label>{roleLine}</Label>
        <Title>{t('Your last shot: who goes down with you?')}</Title>
        <PlayerChoice
          handles={others}
          chosen={null}
          onChoose={(target) => act('shoot', { target })}
        />
      </Hero>
    );
  else if (view.phase === 'hunt')
    body = (
      <Hero>
        <Title>{t('The hunter is taking aim…')}</Title>
      </Hero>
    );
  else if (!view.alive)
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
          chosen={you ? (view.packVotes[you] ?? null) : null}
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
  else if (view.todo === 'brew') body = <Brew view={view} t={t} />;
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
          chosen={null}
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
        <Muted>{t('Talk it through, then vote.')}</Muted>
        <PlayerChoice
          handles={others}
          chosen={null}
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
        <div className={view.phase === 'night' ? '[&_*]:text-primary-foreground/80' : ''}>
          <Label>
            {when} · {roleLine}
          </Label>
        </div>
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
