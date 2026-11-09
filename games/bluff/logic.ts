import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import {
  awards,
  count,
  langOf,
  option,
  score,
  shuffled,
  zeroScores,
  type Lang,
  type Text,
} from '../_kit/rules';

// A strange but true fact with a blank. Everyone writes a convincing fake answer,
// then everyone hunts for the truth among the fakes. Finding the truth scores 2;
// every player your fake fools scores you 1. Six rounds.
type Fact = { fact: Text; truth: Text };
const f = (en: string, nb: string, truthEn: string, truthNb: string): Fact => ({
  fact: { en, nb },
  truth: { en: truthEn, nb: truthNb },
});
const FACTS: Fact[] = [
  f(
    'The national animal of Scotland is the ___.',
    'Skottlands nasjonaldyr er ___.',
    'unicorn',
    'enhjørningen',
  ),
  f(
    'A group of flamingos is called a ___.',
    'En flokk flamingoer kalles på engelsk en «___».',
    'flamboyance',
    'flamboyance',
  ),
  f(
    'Norway’s King’s Guard has knighted a ___.',
    'Kongens Garde har slått en ___ til ridder.',
    'penguin',
    'pingvin',
  ),
  f('Botanically, bananas are ___.', 'Botanisk sett er bananer ___.', 'berries', 'bær'),
  f(
    'The dot over a lowercase i is called a ___.',
    'Prikken over en liten i heter på engelsk en «___».',
    'tittle',
    'tittle',
  ),
  f('Wombats produce ___-shaped poo.', 'Vombater bæsjer i form av ___.', 'cube', 'terninger'),
  f(
    'Honey found in ancient Egyptian tombs was still ___.',
    'Honning funnet i gamle egyptiske graver var fortsatt ___.',
    'edible',
    'spiselig',
  ),
  f(
    'A day on Venus is longer than its ___.',
    'Et døgn på Venus er lengre enn et ___ der.',
    'year',
    'år',
  ),
  f(
    'The first item ever sold on eBay was a broken ___.',
    'Det første som ble solgt på eBay, var en ødelagt ___.',
    'laser pointer',
    'laserpeker',
  ),
  f(
    'The plastic tip of a shoelace is called an ___.',
    'Plasttuppen på en skolisse heter på engelsk en «___».',
    'aglet',
    'aglet',
  ),
  f(
    'Sea otters hold ___ while they sleep.',
    'Havoterer holder ___ mens de sover.',
    'hands',
    'hender',
  ),
  f(
    'The man who designed the Pringles tube was partly buried in a ___.',
    'Mannen som designet Pringles-røret, ble delvis gravlagt i et ___.',
    'Pringles tube',
    'Pringles-rør',
  ),
  f('A “jiffy” is an actual unit of ___.', 'En «jiffy» er en ekte enhet for ___.', 'time', 'tid'),
  f(
    'In Switzerland it is illegal to own just one ___.',
    'I Sveits er det ulovlig å eie bare ett ___.',
    'guinea pig',
    'marsvin',
  ),
  f(
    'In 2009 NRK showed an entire ___ journey from Bergen to Oslo live, and over a million watched.',
    'I 2009 viste NRK en hel ___ fra Bergen til Oslo direkte, og over en million så på.',
    'train',
    'togreise',
  ),
  f(
    'Cleopatra lived closer in time to the ___ than to the building of the Great Pyramid.',
    'Kleopatra levde nærmere i tid ___ enn byggingen av den store pyramiden.',
    'Moon landing',
    'månelandingen',
  ),
  f(
    'A blue whale’s heart is about the size of a small ___.',
    'Hjertet til en blåhval er omtrent på størrelse med en liten ___.',
    'car',
    'bil',
  ),
  f('Butterflies taste with their ___.', 'Sommerfugler smaker med ___.', 'feet', 'føttene'),
  f(
    'Some snails can sleep for up to ___ years.',
    'Noen snegler kan sove i opptil ___ år.',
    'three',
    'tre',
  ),
  f(
    'The Norwegian word “pålegg” means anything you put on ___.',
    'Ordet «pålegg» betyr alt man legger på ___.',
    'bread',
    'brødskiva',
  ),
];
const ROUNDS = 6;

type Option = { text: string; authors: PlayerHandle[]; truth: boolean };
type State = {
  lang: Lang;
  players: PlayerHandle[];
  order: number[];
  at: number;
  phase: 'write' | 'vote' | 'reveal';
  lies: Record<PlayerHandle, string>;
  options: Option[];
  votes: Record<PlayerHandle, number>;
  scores: Record<PlayerHandle, number>;
  fooled: Record<PlayerHandle, number>;
  found: Record<PlayerHandle, number>;
};

const normal = (text: string) => text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
const lie = (payload: Json): { text: string } => {
  const { text } = fields(payload);
  if (typeof text !== 'string' || !text.trim() || text.length > 40)
    invalid('Write a short answer.');
  return { text: text.trim() };
};
const truthOf = (state: State) => FACTS[state.order[state.at]].truth[state.lang];

function startVote(state: State, random: () => number) {
  const options: Option[] = [{ text: truthOf(state), authors: [], truth: true }];
  for (const [author, text] of Object.entries(state.lies)) {
    const same = options.find((o) => !o.truth && normal(o.text) === normal(text));
    if (same) same.authors.push(author);
    else options.push({ text, authors: [author], truth: false });
  }
  state.options = shuffled(options.length, random).map((i) => options[i]);
  state.phase = 'vote';
}

function reveal(state: State) {
  state.phase = 'reveal';
  for (const [voter, choice] of Object.entries(state.votes)) {
    const picked = state.options[choice];
    if (picked.truth) {
      score(state.scores, voter, 2);
      count(state.found, voter);
    } else
      for (const author of picked.authors) {
        score(state.scores, author);
        count(state.fooled, author);
      }
  }
}

export const game = defineGame({
  setup: ({ players, locale, random }): State => ({
    lang: langOf(locale),
    players: [...players],
    order: shuffled(FACTS.length, random).slice(0, ROUNDS),
    at: 0,
    phase: 'write',
    lies: {},
    options: [],
    votes: {},
    scores: zeroScores(players),
    fooled: {},
    found: {},
  }),
  actions: (action) => ({
    write: action({
      payload: lie,
      run: (state, { playerId, payload, random }) => {
        if (state.phase !== 'write' || !playerId) invalid('Writing is over for this round.');
        if (normal(payload.text) === normal(truthOf(state)))
          invalid('That’s the real answer! Write a fake one.');
        state.lies[playerId] = payload.text;
        if (state.players.every((p) => state.lies[p])) startVote(state, random);
      },
    }),
    // Start the hunt once at least two fakes are in, without waiting for everyone.
    hunt: action((state, { random }) => {
      if (state.phase !== 'write') invalid('Writing is over for this round.');
      if (Object.keys(state.lies).length < 2) invalid('Wait for at least two answers.');
      startVote(state, random);
    }),
    vote: action({
      payload: option(17),
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'vote' || !playerId) invalid('Voting is not open.');
        const picked = state.options[payload.value];
        if (!picked) invalid('Choose one of the answers.');
        if (picked.authors.includes(playerId)) invalid('That’s your own answer!');
        state.votes[playerId] = payload.value;
        if (state.players.every((p) => state.votes[p] !== undefined)) reveal(state);
      },
    }),
    reveal: action((state) => {
      if (state.phase !== 'vote' || !Object.keys(state.votes).length)
        invalid('Nobody has voted yet.');
      reveal(state);
    }),
    next: action((state) => {
      if (state.phase !== 'reveal') invalid('Finish this round first.');
      if (state.at + 1 >= state.order.length) {
        endGame({ scores: state.scores });
        return;
      }
      state.at += 1;
      state.phase = 'write';
      state.lies = {};
      state.options = [];
      state.votes = {};
    }),
  }),
  playerLeft: (state, { playerId, random }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.lies[playerId];
    delete state.votes[playerId];
    if (
      state.phase === 'write' &&
      state.players.length &&
      state.players.every((p) => state.lies[p])
    )
      startVote(state, random);
    else if (state.phase === 'vote' && state.players.every((p) => state.votes[p] !== undefined))
      reveal(state);
  },
  view: (state, playerId) => {
    const fact = FACTS[state.order[state.at]];
    const revealed = state.phase === 'reveal';
    return {
      phase: state.phase,
      round: state.at + 1,
      rounds: state.order.length,
      fact: fact.fact[state.lang],
      yourLie: playerId === null ? null : (state.lies[playerId] ?? null),
      written: Object.keys(state.lies).length,
      // Authors and the truth stay hidden until the reveal; you only see which is yours.
      options: state.options.map((o) => ({
        text: o.text,
        mine: playerId !== null && o.authors.includes(playerId),
        truth: revealed ? o.truth : false,
        authors: revealed ? o.authors : ([] as PlayerHandle[]),
        pickedBy: revealed
          ? Object.keys(state.votes).filter((p) => state.options[state.votes[p]] === o)
          : ([] as PlayerHandle[]),
      })),
      yourVote: playerId === null ? null : (state.votes[playerId] ?? null),
      voted: Object.keys(state.votes).length,
      scores: state.scores,
      awards: awards(
        [
          { title: 'masterBluffer', stat: state.fooled, least: 2 },
          { title: 'truthSeeker', stat: state.found, least: 2 },
        ],
        state.players,
      ),
    };
  },
});
