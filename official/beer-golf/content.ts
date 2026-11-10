import type { Text } from '../_kit/rules';

// Beer golf: a round of up to nine holes. Each hole has a par and a score of
// "strokes" (sips for the drink styles, tries for challenge golf). The group
// picks the rule style when the round starts, so each party sets its own rules.

export type Style = 'any' | 'classic' | 'challenge';
export const STYLES: Style[] = ['any', 'classic', 'challenge'];
export const HOLE_COUNTS = [3, 6, 9] as const;
export const MAX_OVER_PAR = 4;
export const STOP_LENGTH = 30;

/** The hole's rule text, `{par}` is replaced by the hole's par. */
export const RULES: Record<Exclude<Style, 'challenge'>, Text> = {
  any: {
    en: 'Finish your drink in {par} sips. Water or a soft drink counts the same.',
    nb: 'Drikk opp i løpet av {par} slurker. Vann eller brus teller likt.',
  },
  // CONTENT REVIEW: the classic wording is the usual beer golf rule. The repo
  // owner decides whether to keep it (see CONTRIBUTING.md content rules).
  classic: {
    en: 'Finish your beer in {par} sips.',
    nb: 'Drikk opp ølen på {par} slurker.',
  },
};

/** Twists that make a hole a little different. Never a penalty. */
export const TWISTS: Text[] = [
  { en: 'Say cheers to someone new first.', nb: 'Skål med noen nye først.' },
  { en: 'Switch hands for this hole.', nb: 'Bytt hånd på dette hullet.' },
  { en: 'No pointing, no names.', nb: 'Ingen peking, ingen navn.' },
  { en: 'Whisper this hole.', nb: 'Hvisk på dette hullet.' },
  { en: 'A calm hole. Take your time.', nb: 'Et rolig hull. Ta deg tid.' },
  { en: 'Everyone counts out loud together.', nb: 'Alle teller høyt sammen.' },
  { en: 'Tell the group a good memory.', nb: 'Fortell en fin minnehistorie.' },
  { en: 'Hum a song while you play.', nb: 'Nynn en sang mens du spiller.' },
  {
    en: 'Compliment the player on your left.',
    nb: 'Gi en kompliment til han eller hun til venstre.',
  },
  { en: 'Stand on one leg.', nb: 'Stå på ett ben.' },
];

/** Challenge golf: a quick task where the score is the number of tries. */
export const CHALLENGES: { par: number; text: Text }[] = [
  {
    par: 3,
    text: {
      en: 'Name five films with a colour in the title.',
      nb: 'Nevn fem filmer med en farge i tittelen.',
    },
  },
  {
    par: 2,
    text: { en: 'Name three countries starting with a B.', nb: 'Nevn tre land som starter på B.' },
  },
  {
    par: 4,
    text: {
      en: 'Name seven animals without a repeat letter at the start.',
      nb: 'Nevn sju dyr som alle starter på ulik bokstav.',
    },
  },
  {
    par: 3,
    text: { en: 'Hum a song until someone guesses it.', nb: 'Nynn en sang til noen gjetter den.' },
  },
  { par: 5, text: { en: 'Name ten foods that are round.', nb: 'Nevn ti matvarer som er runde.' } },
  {
    par: 3,
    text: {
      en: 'Draw a cat in the air. Everyone guesses.',
      nb: 'Tegn en katt i lufta. Alle gjetter.',
    },
  },
  {
    par: 2,
    text: {
      en: 'Say a tongue twister three times fast.',
      nb: 'Si en tungetvinger tre ganger fort.',
    },
  },
  {
    par: 4,
    text: { en: 'Name six capital cities in a row.', nb: 'Nevn seks hovedsteder på rad.' },
  },
  {
    par: 3,
    text: {
      en: 'Name four things you find in a kitchen drawer.',
      nb: 'Nevn fire ting du finner i en kjøkkenskuff.',
    },
  },
  { par: 4, text: { en: 'Spell your name backwards.', nb: 'Stav navnet ditt baklengs.' } },
  {
    par: 3,
    text: {
      en: 'Do your best impression of someone here.',
      nb: 'Gjør ditt beste imitasjonsforsøk av noen her.',
    },
  },
  {
    par: 5,
    text: {
      en: 'Name eight words that rhyme with “night”.',
      nb: 'Nevn åtte ord som rimer på «natt».',
    },
  },
];

/** Pars for the drink styles, in sips. */
export const PARS = [2, 3, 3, 4, 4, 5];

/** Default names for the stops. The host can rename them. */
export const STOPS: Text[] = [
  { en: 'First tee', nb: 'Første utslag' },
  { en: 'The fairway', nb: 'Fairwayen' },
  { en: 'Water hazard', nb: 'Vannhinderet' },
  { en: 'The bunker', nb: 'Bunkeren' },
  { en: 'Dogleg left', nb: 'Venstresving' },
  { en: 'The rough', nb: 'Roughen' },
  { en: 'Par three', nb: 'Par tre' },
  { en: 'The green', nb: 'Greenen' },
  { en: 'Nineteenth hole', nb: 'Det nittende hullet' },
];
