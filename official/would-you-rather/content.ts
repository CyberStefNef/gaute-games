import { PILOT } from './pilot';
import type { Text } from '../_kit/rules';

type Pack = { name: Text; hint: Text; dilemmas: [Text, Text][] };
const x = (en: string, nb: string): Text => ({ en, nb });

export const PACKS: Pack[] = [
  {
    name: x('Social dilemmas', 'Sosiale dilemmaer'),
    hint: x('Awkward choices you have to defend', 'Kleine valg du må forsvare'),
    dilemmas: [
      [
        x(
          'Have your friends choose your dates for a year',
          'La vennene dine velge datene dine i et år',
        ),
        x(
          'Have your parents write your dating profile',
          'La foreldrene dine skrive datingprofilen din',
        ),
      ],
      [
        x('Always know when someone is lying to you', 'Alltid vite når noen lyver for deg'),
        x(
          'Always know what people say about you when you leave',
          'Alltid vite hva folk sier om deg når du går',
        ),
      ],
      [
        x(
          'Have your camera roll shown at a family dinner',
          'Få kamerarullen vist på en familiemiddag',
        ),
        x(
          'Have your family join every group chat you are in',
          'Ha familien med i alle gruppechattene dine',
        ),
      ],
      [
        x(
          'Eat at your favourite restaurant alone for free',
          'Spise gratis alene på favorittrestauranten din',
        ),
        x(
          'Pay double every time you eat out with friends',
          'Betale dobbelt hver gang du spiser ute med venner',
        ),
      ],
      [
        x(
          'Have to defend every opinion you post online in person',
          'Måtte forsvare hver mening du legger ut på nett ansikt til ansikt',
        ),
        x(
          'Have your friends vote on everything you post',
          'La vennene dine stemme over alt du legger ut',
        ),
      ],
      [
        x(
          'Take a free holiday with someone you cannot stand',
          'Dra på gratis ferie med noen du ikke tåler',
        ),
        x(
          'Pay for your whole group to go away together',
          'Betale for at hele vennegjengen drar på tur',
        ),
      ],
      [
        x('Undo the worst thing you ever said', 'Gjøre om det verste du har sagt'),
        x('Hear the apology someone owes you', 'Høre unnskyldningen noen skylder deg'),
      ],
      [
        x('Run into your ex on your worst day', 'Møte eksen på din verste dag'),
        x('Run into your boss on your wildest night out', 'Møte sjefen på din villeste utekveld'),
      ],
      [
        x(
          'Let your friends see every message you almost sent',
          'La vennene dine se alle meldingene du nesten sendte',
        ),
        x(
          'Let them hear every excuse you made to avoid them',
          'La dem høre alle unnskyldningene du brukte for å slippe å møte dem',
        ),
      ],
      [
        x(
          'Have everyone hear your thoughts for ten minutes',
          'La alle høre tankene dine i ti minutter',
        ),
        x(
          'Have to answer every question honestly for an hour',
          'Måtte svare ærlig på alle spørsmål i en time',
        ),
      ],
      [
        x(
          'Get back with your ex and have to tell your friends',
          'Bli sammen med eksen igjen og måtte si det til vennene dine',
        ),
        x(
          'Stay single but have your friends choose every date',
          'Forbli singel, men la vennene dine velge hver date',
        ),
      ],
      [
        x(
          'Have to explain your last ten screenshots to the group',
          'Måtte forklare de ti siste skjermbildene dine til gruppa',
        ),
        x(
          'Have to explain your last ten deleted messages',
          'Måtte forklare de ti siste meldingene du slettet',
        ),
      ],
      [
        x(
          'Live with your best friend and risk the friendship',
          'Bo med bestevennen din og risikere vennskapet',
        ),
        x(
          'Live alone somewhere you cannot invite anyone over',
          'Bo alene et sted du ikke kan ha besøk',
        ),
      ],
      [
        x(
          'Always arrive first and wait alone for half an hour',
          'Alltid komme først og vente alene i en halvtime',
        ),
        x('Always arrive last and miss the start', 'Alltid komme sist og gå glipp av starten'),
      ],
    ],
  },
  {
    name: x('Life', 'Livet'),
    hint: x('Real choices you’ll argue about', 'Ekte valg dere vil krangle om'),
    dilemmas: [
      [
        x(
          'Pay high rent to live near all your friends',
          'Betale høy husleie for å bo nær alle vennene dine',
        ),
        x(
          'Live rent-free but two hours from everyone you know',
          'Bo gratis, men to timer fra alle du kjenner',
        ),
      ],
      [
        x(
          'Have your dream job but no time left for friends',
          'Ha drømmejobben, men ingen tid igjen til venner',
        ),
        x(
          'Have an easy job but never earn enough to move out',
          'Ha en enkel jobb, men aldri tjene nok til å flytte for deg selv',
        ),
      ],
      [
        x(
          'Be respected for your work but always short of money',
          'Bli respektert for arbeidet ditt, men alltid ha dårlig råd',
        ),
        x(
          'Get rich doing work you are embarrassed to explain',
          'Bli rik på en jobb du skammer deg over å forklare',
        ),
      ],
      [
        x('Find out why someone ghosted you', 'Finne ut hvorfor noen ghostet deg'),
        x('Get to tell them exactly what you think of them', 'Få si akkurat hva du mener om dem'),
      ],
      [
        x(
          'Let the person you are messaging watch every edit as you type',
          'La den du skriver til se hver endring mens du skriver',
        ),
        x(
          'Need a friend to approve every message before you send it',
          'Måtte få en venn til å godkjenne hver melding før du sender',
        ),
      ],
      [
        x('Live without music', 'Leve uten musikk'),
        x('Live without films and series', 'Leve uten filmer og serier'),
      ],
      [
        x('Give up your phone for a month', 'Gi fra deg mobilen i en måned'),
        x(
          'Give up seeing your friends in person for a month',
          'Droppe å møte vennene dine ansikt til ansikt i en måned',
        ),
      ],
      [
        x('Have unlimited free flights', 'Ha ubegrenset med gratis flyreiser'),
        x('Have unlimited free food', 'Ha ubegrenset med gratis mat'),
      ],
      [
        x(
          'Always cover the cost so your friends can join the plan',
          'Alltid dekke kostnaden så vennene dine kan bli med',
        ),
        x(
          'Always be the reason the group has to choose a cheaper plan',
          'Alltid være grunnen til at gruppa må velge en billigere plan',
        ),
      ],
      [
        x('Be the funniest person in the room', 'Være den morsomste i rommet'),
        x('Be the smartest person in the room', 'Være den smarteste i rommet'),
      ],
      [
        x(
          'Never pay rent again but live with your worst flatmate',
          'Aldri betale husleie igjen, men bo med din verste samboer',
        ),
        x(
          'Pay double rent to never share a flat again',
          'Betale dobbel husleie for å aldri dele bolig igjen',
        ),
      ],
      [
        x('Live without social media', 'Leve uten sosiale medier'),
        x('Live without takeaway food', 'Leve uten takeaway'),
      ],
      [x('Win the lottery', 'Vinne i lotto'), x('Live twice as long', 'Leve dobbelt så lenge')],
      [
        x(
          'Have the perfect holiday with no say in who comes along',
          'Få den perfekte ferien uten å bestemme hvem som blir med',
        ),
        x(
          'Go somewhere you dislike with your favourite people',
          'Dra et sted du misliker med favorittmenneskene dine',
        ),
      ],
    ],
  },
  {
    name: x('Impossible', 'Umulige'),
    hint: x('Every choice has a catch', 'Hvert valg har en hake'),
    dilemmas: [
      [
        x('Know how you will die', 'Vite hvordan du skal dø'),
        x('Know when you will die', 'Vite når du skal dø'),
      ],
      [
        x('Read minds but be unable to switch it off', 'Lese tanker, men ikke kunne slå det av'),
        x(
          'See the future but be unable to change what you see',
          'Se fremtiden, men ikke kunne endre det du ser',
        ),
      ],
      [
        x('Lose all your photos', 'Miste alle bildene dine'),
        x('Lose all your messages', 'Miste alle meldingene dine'),
      ],
      [
        x('Have everyone hear your thoughts for a day', 'La alle høre tankene dine i én dag'),
        x('Have your browser history made public', 'Få nettleserhistorikken din publisert'),
      ],
      [
        x('Never be able to lie', 'Aldri kunne lyve'),
        x('Never be able to tell when others lie', 'Aldri merke når andre lyver'),
      ],
      [
        x(
          'Restart your life at 10 with what you know now',
          'Starte livet på nytt som tiåring med det du vet nå',
        ),
        x('Skip ahead ten years', 'Hoppe ti år fram i tid'),
      ],
      [
        x(
          'Fly anywhere but always arrive soaking wet',
          'Fly hvor som helst, men alltid komme frem klissvåt',
        ),
        x(
          'Teleport anywhere but leave everything you are carrying behind',
          'Teleportere hvor som helst, men legge igjen alt du har med deg',
        ),
      ],
      [
        x(
          'Have every lie you tell trigger a loud notification',
          'Få et høyt varsel hver gang du lyver',
        ),
        x(
          'Have to immediately tell someone when you know they are lying',
          'Måtte si fra med en gang du vet at noen lyver',
        ),
      ],
      [
        x('Speak every language', 'Snakke alle språk'),
        x('Play every instrument', 'Spille alle instrumenter'),
      ],
      [
        x('Have no internet for a month', 'Være uten internett i en måned'),
        x('Have no hot water for a month', 'Være uten varmtvann i en måned'),
      ],
      [
        x(
          'Go viral for something you are proud of and get hated for it',
          'Gå viralt for noe du er stolt av og få hat for det',
        ),
        x(
          'Go viral for your most embarrassing moment and get loved for it',
          'Gå viralt for ditt flaueste øyeblikk og bli elsket for det',
        ),
      ],
      [
        x(
          'Have your friends pick every photo you post for a year',
          'La vennene dine velge alle bildene du legger ut i et år',
        ),
        x(
          'Be unable to delete anything you post for a year',
          'Ikke kunne slette noe du legger ut i et år',
        ),
      ],
    ],
  },
];

export const PROMPTS = PACKS.map((pack, p) => [
  ...pack.dilemmas.map(([a, b], i) => ({ id: `wyr-legacy-${p}-${i}`, a, b })),
  ...PILOT.filter((prompt) => prompt.pack === p),
]);

// Mix existing prompt records without changing their history IDs.
PROMPTS.push(PROMPTS.flat());
PACKS.push({
  ...PACKS[0],
  name: x('Mixed', 'Blandet'),
  hint: x('A bit of everything', 'Litt av alt'),
});
