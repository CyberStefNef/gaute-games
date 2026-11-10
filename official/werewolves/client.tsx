import { strings } from './strings';
import { useState } from 'react';
import type { ViewOf } from '@gaute/games-sdk/logic';
import { gameClient, useStrings, type Translate } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Card, Hero, Label, Muted, Page, PlayerChoice, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
type View = ViewOf<typeof game>;

type T = Translate<typeof strings.en>;
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
  const t = useStrings(strings);
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
