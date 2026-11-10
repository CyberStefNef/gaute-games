import { PILOT } from './pilot';
import type { Text } from '../_kit/rules';

type Pack = { name: Text; hint: Text; statements: Text[] };
const x = (en: string, nb: string): Text => ({ en, nb });

export const PACKS: Pack[] = [
  {
    name: x('Awkward moments', 'Kleine øyeblikk'),
    hint: x('Mistakes worth telling the story of', 'Tabber det er verdt å fortelle om'),
    statements: [
      x(
        'deleted a post because one specific person did not react.',
        'slettet et innlegg fordi én bestemt person ikke reagerte.',
      ),
      x('fallen asleep at a party.', 'sovnet på en fest.'),
      x('laughed at the wrong moment.', 'ledd i helt feil øyeblikk.'),
      x(
        "accidentally liked an old photo while looking through someone's profile.",
        'likt et gammelt bilde ved et uhell mens jeg snoket på profilen til noen.',
      ),
      x(
        'checked who viewed my story more than I checked my actual messages.',
        'sjekket hvem som så storyen min oftere enn jeg sjekket meldingene mine.',
      ),
      x(
        'waved back at someone who wasn’t waving at me.',
        'vinket tilbake til noen som ikke vinket til meg.',
      ),
      x(
        'muted a group chat and then asked why nobody told me the plan.',
        'dempet en gruppechat og så spurt hvorfor ingen fortalte meg planen.',
      ),
      x(
        'cancelled plans with an excuse, then posted a photo of myself out.',
        'avlyst med en unnskyldning og så lagt ut et bilde av meg selv på byen.',
      ),
      x('told a joke nobody laughed at.', 'fortalt en vits som ingen lo av.'),
      x(
        'tried to fix a bad haircut and made it worse.',
        'prøvd å rette opp en dårlig klipp og gjort den verre.',
      ),
      x(
        'rehearsed an argument alone and still lost the real one.',
        'øvd på en krangel alene og likevel tapt den ekte.',
      ),
      x(
        "looked at someone's location instead of asking where they were.",
        'sjekket posisjonen til noen i stedet for å spørre hvor de var.',
      ),
      x('replied “you too” when it made no sense.', 'svart «i like måte» når det ikke ga mening.'),
      x(
        'sent a screenshot of a chat straight back to the person in it.',
        'sendt et skjermbilde av en chat rett tilbake til personen i den.',
      ),
      x('pretended to know a song I didn’t.', 'latet som jeg kunne en sang jeg ikke kunne.'),
      x(
        'pretended not to see a message while posting somewhere else.',
        'latet som jeg ikke så en melding mens jeg la ut noe et annet sted.',
      ),
      x(
        'pretended to recognise someone and kept the conversation going.',
        'latet som jeg kjente igjen noen og fortsatt samtalen.',
      ),
      x(
        'made a bet I was absolutely sure I would win, then lost.',
        'tapt et veddemål jeg var helt sikker på å vinne.',
      ),
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
      x(
        'posted something just so one person would see it.',
        'lagt ut noe bare for at én person skulle se det.',
      ),
      x(
        'mistaken friendliness for flirting and acted on it.',
        'tatt vennlighet for flørting og gjort et fremstøt.',
      ),
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
      x(
        "used a second account to look at someone's profile.",
        'brukt en annen konto for å se på profilen til noen.',
      ),
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
      x(
        'told the group I was over someone and then messaged them that night.',
        'sagt til gjengen at jeg var ferdig med noen og så sendt dem melding samme kveld.',
      ),
      x(
        'stayed friends with someone just to avoid splitting the group.',
        'fortsatt å være venn med noen bare for å slippe å splitte gjengen.',
      ),
      x(
        "known something about a friend's relationship and not known whether to tell them.",
        'visst noe om forholdet til en venn og ikke visst om jeg burde si det.',
      ),
      x(
        'pretended to be busy because I could not afford the plan.',
        'latet som jeg var opptatt fordi jeg ikke hadde råd til planen.',
      ),
      x(
        'gone somewhere just because I hoped a particular person would be there.',
        'dratt et sted bare fordi jeg håpet en bestemt person var der.',
      ),
      x('apologised years too late.', 'bedt om unnskyldning flere år for sent.'),
      x(
        'written a whole paragraph to someone and deleted it instead of sending it.',
        'skrevet en hel avhandling til noen og slettet den i stedet for å sende.',
      ),
      x(
        'left a group chat hoping someone would ask me to come back.',
        'forlatt en gruppechat og håpet at noen skulle be meg komme tilbake.',
      ),
    ],
  },
];

export const PROMPTS = PACKS.map((pack, p) => [
  ...pack.statements.map((text, i) => ({ ...text, id: `nh-legacy-${p}-${i}` })),
  ...PILOT.filter((prompt) => prompt.pack === p),
]);

// Mix existing prompt records without changing their history IDs.
PROMPTS.push(PROMPTS.flat());
PACKS.push({
  ...PACKS[0],
  name: x('Mixed', 'Blandet'),
  hint: x('A bit of everything', 'Litt av alt'),
});
