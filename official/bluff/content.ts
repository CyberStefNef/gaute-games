import { PILOT } from './pilot';
import type { Text } from '../_kit/rules';

type Fact = {
  fact: Text;
  truth: Text;
  explanation?: Text;
  aliases?: { en: string[]; nb: string[] };
  source?: { url: string; checkedAt: string };
};
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
    'In 2009 NRK showed an entire ___ journey from Bergen to Oslo in full.',
    'I 2009 viste NRK en hel ___ fra Bergen til Oslo.',
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
  {
    fact: {
      en: "Minecraft's Creeper began as a failed attempt to make a ___.",
      nb: 'Creeperen i Minecraft begynte som et mislykket forsøk på å lage en ___.',
    },
    truth: { en: 'pig', nb: 'gris' },
    explanation: {
      en: 'The model dimensions were mixed up while making a pig. The upright result became the Creeper.',
      nb: 'Målene på modellen ble blandet sammen under arbeidet med en gris. Den stående figuren ble til Creeperen.',
    },
    aliases: { en: ['a pig', 'pigs'], nb: ['grisen', 'en gris', 'griser'] },
    source: {
      url: 'https://www.minecraft.net/en-us/article/meet-creeper',
      checkedAt: '2026-11-10',
    },
  },
];
export const PROMPTS = [
  ...FACTS.map((fact, i) => ({
    explanation: { en: '', nb: '' },
    aliases: { en: [] as string[], nb: [] as string[] },
    ...fact,
    id: `bluff-legacy-${i}`,
  })),
  ...PILOT,
];
