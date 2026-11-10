import { PILOT } from './pilot';
import type { Text } from '../_kit/rules';

export type Kind = 'truth' | 'dare';
type Pack = { name: Text; hint: Text; truths: Text[]; dares: Text[] };
const x = (en: string, nb: string): Text => ({ en, nb });

export const PACKS: Pack[] = [
  {
    name: x('Warm-up', 'Oppvarming'),
    hint: x('Easy, funny, for any group', 'Lett og morsomt, for alle'),
    truths: [
      x('What is your most useless talent?', 'Hva er ditt mest ubrukelige talent?'),
      x(
        'What did you make your whole personality for a while?',
        'Hva gjorde du til hele personligheten din en periode?',
      ),
      x('Which app do you open way too often?', 'Hvilken app åpner du altfor ofte?'),
      x(
        'What tiny thing has made you lose interest in someone?',
        'Hvilken liten ting har fått deg til å miste interessen for noen?',
      ),
      x('What was your worst haircut?', 'Hva var din verste frisyre?'),
      x(
        'Which song do you know every word of but would never admit to?',
        'Hvilken sang kan du hvert ord av, men ville aldri innrømmet?',
      ),
      x('What would {p1} be famous for?', 'Hva ville {p1} vært kjent for?'),
      x(
        'What have you spent money on and then hidden the price?',
        'Hva har du brukt penger på og så skjult prisen på?',
      ),
      x(
        'Who here would you ask to write a risky message for you?',
        'Hvem her ville du bedt om å skrive en risikabel melding for deg?',
      ),
      x(
        'What song would expose a phase you pretend never happened?',
        'Hvilken sang ville avslørt en fase du later som aldri skjedde?',
      ),
      x('What is the last thing you searched for online?', 'Hva søkte du sist etter på nettet?'),
      x('What is your weirdest fear?', 'Hva er den rareste frykten din?'),
    ],
    dares: [
      x(
        'Do your best impression of {p1} until someone guesses who.',
        'Gjør din beste etterligning av {p1} til noen gjetter hvem.',
      ),
      x(
        'Sell the group the worst purchase you ever made. You have 30 seconds.',
        'Selg gruppa det verste kjøpet du har gjort. Du har 30 sekunder.',
      ),
      x(
        'Give {p1} a fake excuse for cancelling tonight. They get two follow-up questions to catch you out.',
        'Gi {p1} en falsk unnskyldning for å avlyse i kveld. De får to oppfølgingsspørsmål for å avsløre deg.',
      ),
      x(
        'Try to ask {p1} for a huge favour without saying what you need. They can ask five yes-or-no questions.',
        'Prøv å be {p1} om en stor tjeneste uten å si hva du trenger. De kan stille fem ja-eller-nei-spørsmål.',
      ),
      x(
        'Everyone: on three, point at the person most likely to be late. {p1} counts.',
        'Alle: på tre peker dere på den som oftest kommer for sent. {p1} teller.',
      ),
      x(
        'Imitate how someone here says they are ready to leave. The group guesses who.',
        'Etterlign hvordan noen her sier at de er klare til å dra. Gruppa gjetter hvem.',
      ),
      x(
        'Invent a dating profile for {p1}. Include one thing they would definitely leave out.',
        'Finn på en datingprofil for {p1}. Ta med én ting de helt klart ville utelatt.',
      ),
      x(
        'Say "we need to talk" as a flatmate, a date and your boss. The group guesses which is which.',
        'Si «vi må snakke» som en samboer, en date og sjefen din. Gruppa gjetter hvem som er hvem.',
      ),
      x(
        'Recreate your face after opening a message you were not meant to see. No words.',
        'Vis ansiktet ditt etter å ha åpnet en melding du ikke skulle sett. Uten ord.',
      ),
      x(
        'Defend an opinion you disagree with for 30 seconds. The group chooses it.',
        'Forsvar en mening du er uenig i i 30 sekunder. Gruppa velger den.',
      ),
      x(
        'Everyone invents a job for you. Give a 20-second interview for the worst one.',
        'Alle finner på en jobb til deg. Gjør et 20 sekunders jobbintervju for den verste.',
      ),
      x(
        'Let {p1} interview you for 30 seconds. Every answer must be a lie.',
        'La {p1} intervjue deg i 30 sekunder. Hvert svar må være en løgn.',
      ),
    ],
  },
  {
    name: x('Party', 'Fest'),
    hint: x(
      'Bluffs, performances and group challenges',
      'Bløff, opptredener og gruppeutfordringer',
    ),
    truths: [
      x(
        'What is the most embarrassing thing on your phone right now?',
        'Hva er det mest flaue på mobilen din akkurat nå?',
      ),
      x('What is the last lie you told?', 'Hva er den siste løgnen du fortalte?'),
      x(
        'Who here would you call first in an emergency?',
        'Hvem her ville du ringt først i en nødsituasjon?',
      ),
      x(
        'What would you never want {p1} to find out about you?',
        'Hva vil du aldri at {p1} skal finne ut om deg?',
      ),
      x(
        'Which person here gives the best advice, and which the worst?',
        'Hvem her gir de beste rådene, og hvem de verste?',
      ),
      x(
        'What do you pretend not to care about but check constantly?',
        'Hva later du som du ikke bryr deg om, men sjekker hele tiden?',
      ),
      x(
        'What do you hate-watch and then keep watching?',
        'Hva ser du på bare for å irritere deg, og så fortsetter du å se?',
      ),
      x(
        'Have you ever been told off by a stranger? What happened?',
        'Har du blitt kjeftet på av en fremmed? Hva skjedde?',
      ),
      x(
        'What is a rule you secretly break all the time?',
        'Hvilken regel bryter du i hemmelighet hele tiden?',
      ),
      x(
        'If you had to swap lives with {p1} for a week, what would you do first?',
        'Hvis du måtte bytte liv med {p1} i en uke, hva ville du gjort først?',
      ),
      x('What is the worst date you have been on?', 'Hva er den verste daten du har vært på?'),
      x(
        'Who here could talk you into a terrible idea? What would it be?',
        'Hvem her kunne overtalt deg til en elendig idé? Hva ville det vært?',
      ),
    ],
    dares: [
      x(
        'You and {p1} play flatmates. Argue for 30 seconds about an issue the group invents.',
        'Du og {p1} spiller samboere. Krangle i 30 sekunder om noe gruppa finner på.',
      ),
      x(
        'Keep a straight face while the group tries to make you laugh for 30 seconds.',
        'Hold maska mens gruppa prøver å få deg til å le i 30 sekunder.',
      ),
      x(
        'You and {p1} have 30 seconds to invent a convincing story about how you met.',
        'Du og {p1} har 30 sekunder på å finne på en troverdig historie om hvordan dere møttes.',
      ),
      x(
        'Defend your most embarrassing past phase as if you are still in it. You have 30 seconds.',
        'Forsvar din flaueste tidligere fase som om du fortsatt er i den. Du har 30 sekunder.',
      ),
      x(
        'Everyone closes their eyes and points at whoever takes longest to reply. Open your eyes together.',
        'Alle lukker øynene og peker på den som bruker lengst tid på å svare. Åpne øynene samtidig.',
      ),
      x(
        'Pitch a flat with every red flag the group suggests. You still have to get {p1} to rent it.',
        'Selg inn en leilighet med alle varsellampene gruppa foreslår. Du må fortsatt få {p1} til å leie den.',
      ),
      x(
        'Imitate {p1} trying to explain why they left someone on read.',
        'Etterlign {p1} som prøver å forklare hvorfor de lot en melding stå på lest.',
      ),
      x(
        'Pitch a terrible business idea for 30 seconds. {p1} decides whether to invest.',
        'Selg inn en elendig forretningsidé i 30 sekunder. {p1} bestemmer om de vil investere.',
      ),
      x(
        'Speak only in questions until your next turn.',
        'Snakk bare i spørsmål til din neste tur.',
      ),
      x(
        'You and {p1} each invent a fake story about the other. The group picks the one that sounds more believable.',
        'Du og {p1} finner på hver deres falske historie om den andre. Gruppa velger den mest troverdige.',
      ),
      x(
        'Sell {p1} on a terrible date idea without admitting why it is terrible.',
        'Overbevis {p1} om en elendig date-idé uten å innrømme hva som er galt med den.',
      ),
      x(
        'Describe a photo you wish you had never been in. The group guesses what happened.',
        'Beskriv et bilde du skulle ønske du ikke var med på. Gruppa gjetter hva som skjedde.',
      ),
    ],
  },
  {
    name: x('Deep talk', 'Dype samtaler'),
    hint: x('Honest questions, get to know each other', 'Ærlige spørsmål, bli bedre kjent'),
    truths: [
      x(
        'What is something you are proud of that nobody here knows?',
        'Hva er du stolt av som ingen her vet om?',
      ),
      x('When did you last cry, and why?', 'Når gråt du sist, og hvorfor?'),
      x(
        'What did you ignore even though your friends were right about it?',
        'Hva ignorerte du selv om vennene dine hadde rett?',
      ),
      x('What do people often get wrong about you?', 'Hva tar folk ofte feil av om deg?'),
      x(
        'What does {p1} get away with that you never could?',
        'Hva slipper {p1} unna med som du aldri kunne gjort?',
      ),
      x(
        'What would you try if nobody you knew could ever find out?',
        'Hva ville du prøvd hvis ingen du kjenner kunne funnet det ut?',
      ),
      x(
        'Which moment of your life would you relive?',
        'Hvilket øyeblikk i livet ville du opplevd på nytt?',
      ),
      x(
        'What do you judge people for while doing it yourself?',
        'Hva dømmer du andre for selv om du gjør det selv?',
      ),
      x(
        "When did you last pretend to agree just to stay on someone's good side?",
        'Når lot du sist som du var enig bare for å holde deg inne med noen?',
      ),
      x(
        'What are you jealous of that you would never admit in the group chat?',
        'Hva er du misunnelig på som du aldri ville innrømmet i gruppechatten?',
      ),
    ],
    dares: [
      x(
        'Say what your first impression of {p1} was. They tell you what you got wrong.',
        'Si hva førsteinntrykket ditt av {p1} var. De sier hva du tok feil av.',
      ),
      x(
        'Let everyone guess which person here you would call for help hiding an embarrassing mistake. Then pick.',
        'La alle gjette hvem her du ville ringt for å skjule en flau tabbe. Velg etterpå.',
      ),
      x(
        'Tell a true story in 30 seconds. Leave out one detail and let the group guess it.',
        'Fortell en sann historie på 30 sekunder. Utelat én detalj og la gruppa gjette den.',
      ),
      x(
        'Everyone predicts what you will be doing in five years. Pick the most likely prediction.',
        'Alle gjetter hva du gjør om fem år. Velg det mest sannsynlige svaret.',
      ),
      x(
        'Invent a voice note from {p1} after their worst possible first date. Perform it without recording anything.',
        'Finn på en talemelding fra {p1} etter deres verst tenkelige første date. Fremfør den uten å ta opp noe.',
      ),
      x('Tell the story of how you met {p1}.', 'Fortell historien om hvordan du møtte {p1}.'),
      x(
        'Let {p1} tell one true story about you and invent one. Everyone else guesses which happened.',
        'La {p1} fortelle én sann historie om deg og finne på én. Resten gjetter hva som skjedde.',
      ),
      x(
        "You and {p1} each guess the other's worst habit as a flatmate. Reveal together.",
        'Du og {p1} gjetter hverandres verste vane som samboer. Si det samtidig.',
      ),
    ],
  },
  {
    name: x('Bold', 'Modig'),
    hint: x('Daring dares and cheeky truths', 'Dristige utfordringer og frekke spørsmål'),
    truths: [
      x(
        'Who here would you most like to go on a holiday with?',
        'Hvem her ville du helst dratt på ferie med?',
      ),
      x('What is your biggest turn-off?', 'Hva er det som tenner deg minst?'),
      x(
        'Have you ever had a crush on someone in this room?',
        'Har du noen gang vært forelsket i noen i dette rommet?',
      ),
      x(
        'What did you do just because someone told you not to?',
        'Hva gjorde du bare fordi noen ba deg la være?',
      ),
      x(
        'What would make you mute {p1} for a week?',
        'Hva ville fått deg til å dempe {p1} i en uke?',
      ),
      x(
        'What is the worst message you sent while trying to flirt?',
        'Hva er den verste meldingen du har sendt mens du prøvde å flørte?',
      ),
      x(
        'What is something you would only admit to tonight?',
        'Hva ville du bare innrømmet i kveld?',
      ),
      x('Who was your first celebrity crush?', 'Hvem var din første kjendisforelskelse?'),
    ],
    dares: [
      x(
        'Invent three search queries that sum up your week. The group guesses which one actually happened.',
        'Finn på tre nettsøk som oppsummerer uka di. Gruppa gjetter hvilket du faktisk gjorde.',
      ),
      x(
        'Write a fake apology for a disaster the group invents. Read it like someone trying to keep their followers.',
        'Finn på en unnskyldning for en katastrofe gruppa finner på. Les den som noen som prøver å beholde følgerne sine.',
      ),
      x(
        'You and {p1} pretend you have been caught sneaking out of a party. Give matching excuses without planning first.',
        'Du og {p1} later som dere blir tatt i å snike dere fra en fest. Gi samme unnskyldning uten å planlegge først.',
      ),
      x(
        'Flirt with {p1} using only complaints. They decide whether to give you a second date.',
        'Flørt med {p1} bare ved å klage. De avgjør om du får en andre date.',
      ),
      x(
        'Ask {p1} five questions as if you are their suspicious flatmate. They must answer without using yes or no.',
        'Still {p1} fem spørsmål som om du er deres mistenksomme samboer. De må svare uten å bruke ja eller nei.',
      ),
      x(
        'Act out how you flirt. {p1} plays someone who completely misses the hint.',
        'Vis hvordan du flørter. {p1} spiller en som ikke tar hintet.',
      ),
      x(
        'You and {p1} must agree on the worst possible first date in 30 seconds. Pitch it to the group.',
        'Du og {p1} må bli enige om den verst tenkelige første daten på 30 sekunder. Selg den inn til gruppa.',
      ),
      x(
        'Pretend you accidentally sent a screenshot to the person in it. Talk your way out of it.',
        'Lat som du sendte et skjermbilde til personen i det ved et uhell. Prøv å snakke deg ut av det.',
      ),
    ],
  },
];

export const PROMPTS = PACKS.map((pack, p) => ({
  truth: [
    ...pack.truths.map((text, i) => ({ ...text, id: `td-legacy-${p}-truth-${i}` })),
    ...PILOT.filter((prompt) => prompt.pack === p && prompt.kind === 'truth'),
  ],
  dare: [
    ...pack.dares.map((text, i) => ({ ...text, id: `td-legacy-${p}-dare-${i}` })),
    ...PILOT.filter((prompt) => prompt.pack === p && prompt.kind === 'dare'),
  ],
}));

// Mix existing prompt records without changing their history IDs.
PROMPTS.push({
  truth: PROMPTS.flatMap((pack) => pack.truth),
  dare: PROMPTS.flatMap((pack) => pack.dare),
});
PACKS.push({
  ...PACKS[0],
  name: x('Mixed', 'Blandet'),
  hint: x('A bit of everything', 'Litt av alt'),
});
