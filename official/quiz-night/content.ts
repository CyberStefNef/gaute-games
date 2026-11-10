import type { Text } from '../_kit/rules';

type Category = 'geo' | 'science' | 'nature' | 'culture' | 'history' | 'norway' | 'sport';
type Question = { q: Text; options: [Text, Text, Text, Text]; answer: number; c: Category };
const t = (en: string, nb = en): Text => ({ en, nb });

export const QUESTIONS: Question[] = [
  {
    q: t('What is the capital of Australia?', 'Hva er hovedstaden i Australia?'),
    options: [t('Sydney'), t('Canberra'), t('Melbourne'), t('Perth')],
    answer: 1,
    c: 'geo',
  },
  {
    q: t(
      'How many planets are in our solar system?',
      'Hvor mange planeter er det i solsystemet vårt?',
    ),
    options: [t('7'), t('8'), t('9'), t('10')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('Which is the largest ocean?', 'Hvilket hav er størst?'),
    options: [
      t('The Atlantic', 'Atlanterhavet'),
      t('The Indian Ocean', 'Det indiske hav'),
      t('The Pacific', 'Stillehavet'),
      t('The Arctic Ocean', 'Polhavet'),
    ],
    answer: 2,
    c: 'geo',
  },
  {
    q: t('What is the chemical symbol for gold?', 'Hva er det kjemiske symbolet for gull?'),
    options: [t('Ag'), t('Au'), t('Gd'), t('Go')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('Who painted the Mona Lisa?', 'Hvem malte Mona Lisa?'),
    options: [t('Michelangelo'), t('Raphael'), t('Leonardo da Vinci'), t('Vincent van Gogh')],
    answer: 2,
    c: 'culture',
  },
  {
    q: t('What is the longest river in Norway?', 'Hva er Norges lengste elv?'),
    options: [t('Glomma'), t('Numedalslågen'), t('Tana'), t('Gudbrandsdalslågen')],
    answer: 0,
    c: 'norway',
  },
  {
    q: t('How many hearts does an octopus have?', 'Hvor mange hjerter har en blekksprut?'),
    options: [t('1'), t('2'), t('3'), t('4')],
    answer: 2,
    c: 'nature',
  },
  {
    q: t('In which year did the Berlin Wall fall?', 'Hvilket år falt Berlinmuren?'),
    options: [t('1987'), t('1989'), t('1991'), t('1993')],
    answer: 1,
    c: 'history',
  },
  {
    q: t('What is Norway’s highest mountain?', 'Hva er Norges høyeste fjell?'),
    options: [t('Galdhøpiggen'), t('Glittertind'), t('Snøhetta'), t('Store Skagastølstind')],
    answer: 0,
    c: 'norway',
  },
  {
    q: t('Which is the fastest land animal?', 'Hvilket landdyr er raskest?'),
    options: [
      t('Lion', 'Løve'),
      t('Cheetah', 'Gepard'),
      t('Pronghorn', 'Gaffelantilope'),
      t('Horse', 'Hest'),
    ],
    answer: 1,
    c: 'nature',
  },
  {
    q: t('Which gas do plants take in from the air?', 'Hvilken gass tar planter opp fra lufta?'),
    options: [
      t('Oxygen', 'Oksygen'),
      t('Nitrogen'),
      t('Carbon dioxide', 'Karbondioksid'),
      t('Helium'),
    ],
    answer: 2,
    c: 'science',
  },
  {
    q: t('How many bones does an adult human have?', 'Hvor mange bein har et voksent menneske?'),
    options: [t('186'), t('206'), t('226'), t('246')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('What is the smallest prime number?', 'Hva er det minste primtallet?'),
    options: [t('0'), t('1'), t('2'), t('3')],
    answer: 2,
    c: 'science',
  },
  {
    q: t(
      'Which language has the most native speakers?',
      'Hvilket språk har flest morsmålsbrukere?',
    ),
    options: [
      t('English', 'Engelsk'),
      t('Spanish', 'Spansk'),
      t('Mandarin Chinese', 'Mandarin'),
      t('Hindi'),
    ],
    answer: 2,
    c: 'culture',
  },
  {
    q: t('What is the hardest natural material?', 'Hva er det hardeste naturlige materialet?'),
    options: [t('Diamond', 'Diamant'), t('Gold', 'Gull'), t('Iron', 'Jern'), t('Quartz', 'Kvarts')],
    answer: 0,
    c: 'science',
  },
  {
    q: t(
      'How many players does a football team have on the pitch?',
      'Hvor mange spillere har et fotballag på banen?',
    ),
    options: [t('9'), t('10'), t('11'), t('12')],
    answer: 2,
    c: 'sport',
  },
  {
    q: t(
      'At what Fahrenheit temperature does water freeze?',
      'Ved hvor mange grader Fahrenheit fryser vann?',
    ),
    options: [t('0 °F'), t('32 °F'), t('100 °F'), t('212 °F')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('What is the capital of Canada?', 'Hva er hovedstaden i Canada?'),
    options: [t('Toronto'), t('Vancouver'), t('Ottawa'), t('Montreal')],
    answer: 2,
    c: 'geo',
  },
  {
    q: t('Which planet is called the Red Planet?', 'Hvilken planet kalles den røde planeten?'),
    options: [t('Venus'), t('Mars'), t('Jupiter'), t('Mercury', 'Merkur')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('Which instrument usually has 88 keys?', 'Hvilket instrument har vanligvis 88 tangenter?'),
    options: [t('Guitar', 'Gitar'), t('Piano'), t('Accordion', 'Trekkspill'), t('Harp', 'Harpe')],
    answer: 1,
    c: 'culture',
  },
  {
    q: t('Which is the largest planet?', 'Hvilken planet er størst?'),
    options: [t('Saturn'), t('Jupiter'), t('Neptune', 'Neptun'), t('Uranus')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('How many minutes are there in a day?', 'Hvor mange minutter er det i et døgn?'),
    options: [t('1,240', '1 240'), t('1,440', '1 440'), t('1,640', '1 640'), t('1,840', '1 840')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('What is the capital of Iceland?', 'Hva er hovedstaden på Island?'),
    options: [t('Reykjavík'), t('Akureyri'), t('Tórshavn'), t('Nuuk')],
    answer: 0,
    c: 'geo',
  },
  {
    q: t(
      'Which metal is liquid at room temperature?',
      'Hvilket metall er flytende i romtemperatur?',
    ),
    options: [t('Lead', 'Bly'), t('Mercury', 'Kvikksølv'), t('Tin', 'Tinn'), t('Zinc', 'Sink')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('How many sides does a hexagon have?', 'Hvor mange sider har en sekskant?'),
    options: [t('5'), t('6'), t('7'), t('8')],
    answer: 1,
    c: 'science',
  },
  {
    q: t(
      'Which country gives London its Trafalgar Square Christmas tree every year?',
      'Hvilket land gir London juletreet på Trafalgar Square hvert år?',
    ),
    options: [t('Sweden', 'Sverige'), t('Norway', 'Norge'), t('Denmark', 'Danmark'), t('Finland')],
    answer: 1,
    c: 'norway',
  },
  {
    q: t(
      'What is Norway’s sweet brown cheese called?',
      'Hva heter den søte, brune osten fra Norge?',
    ),
    options: [t('Brunost'), t('Gamalost'), t('Pultost'), t('Jarlsberg')],
    answer: 0,
    c: 'norway',
  },
  {
    q: t('Roughly how fast does light travel?', 'Omtrent hvor fort går lyset?'),
    options: [
      t('30,000 km/s', '30 000 km/s'),
      t('150,000 km/s', '150 000 km/s'),
      t('300,000 km/s', '300 000 km/s'),
      t('3,000,000 km/s', '3 000 000 km/s'),
    ],
    answer: 2,
    c: 'science',
  },
  {
    q: t('Which is the largest mammal?', 'Hvilket pattedyr er størst?'),
    options: [
      t('Elephant', 'Elefant'),
      t('Blue whale', 'Blåhval'),
      t('Giraffe', 'Sjiraff'),
      t('Orca', 'Spekkhogger'),
    ],
    answer: 1,
    c: 'nature',
  },
  {
    q: t('How many continents are there?', 'Hvor mange kontinenter er det?'),
    options: [t('5'), t('6'), t('7'), t('8')],
    answer: 2,
    c: 'geo',
  },
  {
    q: t('Which country has the most lakes?', 'Hvilket land har flest innsjøer?'),
    options: [t('Canada'), t('Finland'), t('Russia', 'Russland'), t('USA')],
    answer: 0,
    c: 'geo',
  },
  {
    q: t('What is H₂O better known as?', 'Hva er H₂O bedre kjent som?'),
    options: [t('Salt'), t('Water', 'Vann'), t('Oxygen', 'Oksygen'), t('Sugar', 'Sukker')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('How many legs does a spider have?', 'Hvor mange bein har en edderkopp?'),
    options: [t('6'), t('8'), t('10'), t('12')],
    answer: 1,
    c: 'nature',
  },
  {
    q: t('Who wrote the play A Doll’s House?', 'Hvem skrev skuespillet Et dukkehjem?'),
    options: [
      t('Henrik Ibsen'),
      t('Bjørnstjerne Bjørnson'),
      t('Knut Hamsun'),
      t('August Strindberg'),
    ],
    answer: 0,
    c: 'culture',
  },
  {
    q: t(
      'In which year did Norway’s union with Sweden end?',
      'Hvilket år ble unionen med Sverige oppløst?',
    ),
    options: [t('1814'), t('1884'), t('1905'), t('1945')],
    answer: 2,
    c: 'norway',
  },
  {
    q: t(
      'How many rings are on the Olympic flag?',
      'Hvor mange ringer er det i det olympiske flagget?',
    ),
    options: [t('4'), t('5'), t('6'), t('7')],
    answer: 1,
    c: 'sport',
  },
  {
    q: t('What is the capital of Japan?', 'Hva er hovedstaden i Japan?'),
    options: [t('Osaka'), t('Kyoto'), t('Tokyo'), t('Seoul')],
    answer: 2,
    c: 'geo',
  },
  {
    q: t('Which planet is closest to the Sun?', 'Hvilken planet er nærmest sola?'),
    options: [t('Venus'), t('Mercury', 'Merkur'), t('Mars'), t('Earth', 'Jorda')],
    answer: 1,
    c: 'science',
  },
  {
    q: t('What do pandas mostly eat?', 'Hva spiser pandaer mest?'),
    options: [t('Bamboo', 'Bambus'), t('Fish', 'Fisk'), t('Berries', 'Bær'), t('Grass', 'Gress')],
    answer: 0,
    c: 'nature',
  },
  {
    q: t(
      'Which band had a worldwide hit with Take On Me?',
      'Hvilket band fikk en verdenshit med Take On Me?',
    ),
    options: [t('ABBA'), t('Roxette'), t('a-ha'), t('Europe')],
    answer: 2,
    c: 'culture',
  },
  {
    q: t('Which city is home to the Arctic Cathedral?', 'Hvilken by har Ishavskatedralen?'),
    options: [t('Bodø'), t('Tromsø'), t('Alta'), t('Narvik')],
    answer: 1,
    c: 'norway',
  },
  {
    q: t(
      'In which sport can you score a slam dunk?',
      'I hvilken sport kan man score med en slam dunk?',
    ),
    options: [t('Volleyball'), t('Handball', 'Håndball'), t('Basketball'), t('Tennis')],
    answer: 2,
    c: 'sport',
  },
  {
    q: t(
      'At what temperature does water boil at sea level?',
      'Ved hvilken temperatur koker vann ved havnivå?',
    ),
    options: [t('90 °C'), t('100 °C'), t('110 °C'), t('120 °C')],
    answer: 1,
    c: 'science',
  },
  {
    q: t(
      'Which is the largest hot desert in the world?',
      'Hvilken er verdens største varme ørken?',
    ),
    options: [t('Gobi'), t('Kalahari'), t('Sahara'), t('The Arabian Desert', 'Den arabiske ørken')],
    answer: 2,
    c: 'geo',
  },
  {
    q: t('When is Norway’s Constitution Day?', 'Når er Norges grunnlovsdag?'),
    options: [
      t('1 May', '1. mai'),
      t('17 May', '17. mai'),
      t('6 June', '6. juni'),
      t('24 June', '24. juni'),
    ],
    answer: 1,
    c: 'norway',
  },
];
export const CATEGORY_NAMES: Record<Category, Text> = {
  geo: t('Geography', 'Geografi'),
  science: t('Science', 'Vitenskap'),
  nature: t('Nature', 'Natur'),
  culture: t('Culture', 'Kultur'),
  history: t('History', 'Historie'),
  norway: t('Norway', 'Norge'),
  sport: t('Sport', 'Sport'),
};
