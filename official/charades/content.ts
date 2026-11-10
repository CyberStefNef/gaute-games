import type { Text } from '../_kit/rules';
import type { Word, WordPack } from '../_kit/timed';

const x = (en: string, nb: string): Text => ({ en, nb });
const hard = (en: string, nb: string): Word => ({ en, nb, hard: true });

export const PACKS: WordPack[] = [
  {
    name: x('Everyday', 'Hverdag'),
    hint: x('Things everybody does', 'Ting alle gjør'),
    words: [
      x('Brushing your teeth', 'Pusse tennene'),
      x('Making pancakes', 'Lage pannekaker'),
      x('Walking a dog', 'Gå tur med hunden'),
      x('Taking a selfie', 'Ta en selfie'),
      x(
        'Getting ready while telling everyone you are already on your way',
        'Gjøre deg klar mens du sier at du allerede er på vei',
      ),
      x('Waiting for the bus', 'Vente på bussen'),
      x('Chopping onions', 'Hakke løk'),
      x('Opening a stuck jar', 'Åpne et glass som sitter fast'),
      x('Singing in the shower', 'Synge i dusjen'),
      x(
        'Trying to leave a party without anyone noticing',
        'Prøve å dra fra en fest uten at noen merker det',
      ),
      hard('Assembling flat-pack furniture', 'Skru sammen flatpakkmøbler'),
      hard('Missing the last bus', 'Miste siste buss'),
      hard('Walking on ice', 'Gå på glatta'),
      hard("Finding an earbud in a stranger's seat", 'Finne en ørepropp i setet til en fremmed'),
    ],
  },
  {
    name: x('Sports & hobbies', 'Sport og hobby'),
    hint: x('Moves you can mime', 'Bevegelser du kan mime'),
    words: [
      x('Skiing', 'Gå på ski'),
      x('Trying to look natural in a photo', 'Prøve å se naturlig ut på et bilde'),
      x('Surfing', 'Surfe'),
      x('Carrying too many drinks through a crowd', 'Bære for mange glass gjennom en folkemengde'),
      x('Playing the drums', 'Spille trommer'),
      x('Doing yoga', 'Gjøre yoga'),
      x('Bowling', 'Bowle'),
      x('Ice skating', 'Gå på skøyter'),
      x('Lifting weights', 'Løfte vekter'),
      x('Playing tennis', 'Spille tennis'),
      hard('Trying to catch the last train in heels', 'Prøve å rekke siste tog i høye hæler'),
      hard('Fencing', 'Fekting'),
      hard('Synchronised swimming', 'Synkronsvømming'),
      hard('Pretending to understand the gym equipment', 'Late som du forstår treningsapparatet'),
    ],
  },
  {
    name: x('Jobs & roles', 'Yrker og roller'),
    hint: x('Who are you being?', 'Hvem spiller du?'),
    words: [
      x('Pilot', 'Pilot'),
      x('Chef', 'Kokk'),
      x('Hairdresser', 'Frisør'),
      x('Dentist', 'Tannlege'),
      x('Firefighter', 'Brannkonstabel'),
      x('Waiter', 'Servitør'),
      x('Photographer', 'Fotograf'),
      x('A DJ whose music stops working', 'En DJ som mister lyden'),
      x('A delivery rider at the wrong address', 'Et matbud på feil adresse'),
      x('Lifeguard', 'Badevakt'),
      hard('Air traffic controller', 'Flygeleder'),
      hard('A bouncer rejecting their own friend', 'En dørvakt som avviser sin egen venn'),
      hard(
        'An influencer filming in a crowded gym',
        'En influenser som filmer på et fullt treningssenter',
      ),
      hard('Magician', 'Tryllekunstner'),
    ],
  },
  {
    name: x('Wild', 'Ville'),
    hint: x('Strange situations, big laughs', 'Rare situasjoner, mye latter'),
    words: [
      x('Riding a rollercoaster', 'Kjøre berg-og-dal-bane'),
      x('Catching a fly', 'Fange en flue'),
      x('Building a snowman', 'Lage snømann'),
      x('Trying to get a duvet into its cover', 'Prøve å få dyna inn i dynetrekket'),
      x('Watching a horror film', 'Se en skrekkfilm'),
      x(
        'Trying to open a loud snack bag in a quiet cinema',
        'Prøve å åpne en bråkete snackspose på en stille kino',
      ),
      hard('Escaping from a bee', 'Flykte fra en bie'),
      hard('Being stuck in a lift', 'Sitte fast i en heis'),
      hard('Walking a cat on a lead', 'Gå tur med en katt i bånd'),
      hard(
        'Seeing the bill after saying the meal is on you',
        'Se regningen etter å ha sagt at du spanderer',
      ),
      hard('Losing your phone in the sofa', 'Miste mobilen i sofaen'),
      hard(
        'Trying to act normal after spotting your ex',
        'Prøve å oppføre deg normalt etter å ha sett eksen',
      ),
    ],
  },
];

export const WORDS = PACKS.flatMap((pack) => pack.words);
