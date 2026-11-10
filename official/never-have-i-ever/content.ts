import { PILOT } from './pilot';
import type { Text } from '../_kit/rules';

type Pack = { name: Text; hint: Text; statements: Text[] };
const x = (en: string, nb: string): Text => ({ en, nb });

export const PACKS: Pack[] = [
  {
    name: x('Fun', 'Moro'),
    hint: x('Harmless and silly, for any group', 'Uskyldig og tullete, for alle'),
    statements: [
      x('sung karaoke in public.', 'sunget karaoke offentlig.'),
      x('fallen asleep at a party.', 'sovnet på en fest.'),
      x('laughed at the wrong moment.', 'ledd i helt feil øyeblikk.'),
      x('walked into a glass door.', 'gått rett inn i en glassdør.'),
      x('eaten food that fell on the floor.', 'spist mat som falt på gulvet.'),
      x(
        'waved back at someone who wasn’t waving at me.',
        'vinket tilbake til noen som ikke vinket til meg.',
      ),
      x('locked myself out of my home.', 'låst meg ute hjemmefra.'),
      x('binge-watched a whole series in one weekend.', 'sett en hel serie på én helg.'),
      x('told a joke nobody laughed at.', 'fortalt en vits som ingen lo av.'),
      x('cut my own hair.', 'klipt mitt eget hår.'),
      x(
        'talked to a pet like it was a person.',
        'snakket med et kjæledyr som om det var et menneske.',
      ),
      x('gotten lost in my own city.', 'gått meg vill i min egen by.'),
      x('replied “you too” when it made no sense.', 'svart «i like måte» når det ikke ga mening.'),
      x('fallen off a bike in front of people.', 'falt av sykkelen foran folk.'),
      x('pretended to know a song I didn’t.', 'latet som jeg kunne en sang jeg ikke kunne.'),
      x('cried at an advert.', 'grått av en reklame.'),
      x('been on TV or the radio.', 'vært på TV eller radio.'),
      x('gone swimming in the sea in winter.', 'badet i sjøen om vinteren.'),
    ],
  },
  {
    name: x('Party', 'Fest'),
    hint: x('Nights out, mishaps and secrets', 'Utekvelder, uhell og hemmeligheter'),
    statements: [
      x('danced on a table.', 'danset på et bord.'),
      x('sent a message to the wrong person.', 'sendt en melding til feil person.'),
      x('stalked an ex online.', 'snoket på en eks på nett.'),
      x('lied about my age.', 'løyet om alderen min.'),
      x('regifted a present.', 'gitt bort en gave jeg selv har fått.'),
      x('had a crush on a teacher.', 'vært forelsket i en lærer.'),
      x(
        'pretended to be on the phone to avoid someone.',
        'latet som jeg snakket i telefonen for å unngå noen.',
      ),
      x('broken something and blamed someone else.', 'knust noe og gitt noen andre skylda.'),
      x('skipped school or work for a concert.', 'skulket skole eller jobb for en konsert.'),
      x(
        'sent a voice message longer than five minutes.',
        'sendt en talemelding på over fem minutter.',
      ),
      x('missed a flight or a train.', 'kommet for sent til et fly eller et tog.'),
      x(
        'forgotten someone’s name right after meeting them.',
        'glemt navnet til noen rett etter at jeg møtte dem.',
      ),
      x('ghosted someone.', 'ghostet noen.'),
      x('snuck into an event without a ticket.', 'sneket meg inn på et arrangement uten billett.'),
      x('got a tattoo I regret.', 'tatt en tatovering jeg angrer på.'),
      x('kissed someone in this room.', 'kysset noen i dette rommet.'),
      x('been kicked out of a bar.', 'blitt kastet ut av en bar.'),
      x('used a fake name to meet someone.', 'brukt et falskt navn for å møte noen.'),
    ],
  },
  {
    name: x('Deep', 'Dyp'),
    hint: x('Honest moments, bigger stories', 'Ærlige øyeblikk, større historier'),
    statements: [
      x('moved somewhere I didn’t know anyone.', 'flyttet et sted der jeg ikke kjente noen.'),
      x('quit something I loved.', 'sluttet med noe jeg elsket.'),
      x('told someone I loved them first.', 'vært den første som sa «jeg elsker deg».'),
      x('lost touch with a best friend.', 'mistet kontakten med en bestevenn.'),
      x('changed my mind about something big.', 'ombestemt meg om noe stort.'),
      x('done something that scared me on purpose.', 'gjort noe som skremte meg, med vilje.'),
      x('kept a secret for more than five years.', 'holdt på en hemmelighet i over fem år.'),
      x('cried in front of my boss.', 'grått foran sjefen min.'),
      x('travelled alone.', 'reist alene.'),
      x('apologised years too late.', 'bedt om unnskyldning flere år for sent.'),
      x('written a letter I never sent.', 'skrevet et brev jeg aldri sendte.'),
      x('started over from scratch.', 'begynt helt på nytt.'),
    ],
  },
];

export const PROMPTS = PACKS.map((pack, p) => [
  ...pack.statements.map((text, i) => ({ ...text, id: `nh-legacy-${p}-${i}` })),
  ...PILOT.filter((prompt) => prompt.pack === p),
]);
