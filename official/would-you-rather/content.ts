import { PILOT } from './pilot';
import type { Text } from '../_kit/rules';

type Pack = { name: Text; hint: Text; dilemmas: [Text, Text][] };
const x = (en: string, nb: string): Text => ({ en, nb });

export const PACKS: Pack[] = [
  {
    name: x('Silly', 'Tullete'),
    hint: x('Absurd choices, easy laughs', 'Absurde valg, lette latter'),
    dilemmas: [
      [
        x('Sing every time you speak', 'Synge hver gang du snakker'),
        x('Dance every time you walk', 'Danse hver gang du går'),
      ],
      [
        x('Only be able to whisper', 'Bare kunne hviske'),
        x('Only be able to shout', 'Bare kunne rope'),
      ],
      [
        x('Always have to sneeze', 'Alltid måtte nyse'),
        x('Always have hiccups', 'Alltid ha hikke'),
      ],
      [
        x('Eat pizza every day', 'Spise pizza hver dag'),
        x('Never eat pizza again', 'Aldri spise pizza igjen'),
      ],
      [
        x('Have fingers as long as your legs', 'Ha fingre like lange som beina'),
        x('Have legs as short as your fingers', 'Ha bein like korte som fingrene'),
      ],
      [x('Talk to animals', 'Snakke med dyr'), x('Talk to plants', 'Snakke med planter')],
      [
        x('Have a rewind button for your life', 'Ha en spol-tilbake-knapp for livet'),
        x('Have a pause button for your life', 'Ha en pauseknapp for livet'),
      ],
      [
        x('Wear clown shoes for a year', 'Gå med klovnesko i et år'),
        x('Wear a clown nose for a year', 'Ha klovnenese i et år'),
      ],
      [
        x('Fight one horse-sized duck', 'Slåss mot én and på størrelse med en hest'),
        x('Fight a hundred duck-sized horses', 'Slåss mot hundre hester på størrelse med ender'),
      ],
      [
        x(
          'Have a personal theme song that plays when you enter a room',
          'Ha en egen kjenningsmelodi når du går inn i et rom',
        ),
        x('Have a laugh track after everything you say', 'Ha latterspor etter alt du sier'),
      ],
      [
        x('Be stuck in a lift with your boss', 'Sitte fast i en heis med sjefen din'),
        x('Be stuck in a lift with your ex', 'Sitte fast i en heis med eksen din'),
      ],
      [
        x('Only eat brown cheese for a week', 'Bare spise brunost i en uke'),
        x('Only eat fish balls for a week', 'Bare spise fiskeboller i en uke'),
      ],
      [x('Have a dog', 'Ha hund'), x('Have a cat', 'Ha katt')],
      [
        x('Always be 10 minutes late', 'Alltid komme 10 minutter for sent'),
        x('Always be 20 minutes early', 'Alltid komme 20 minutter for tidlig'),
      ],
    ],
  },
  {
    name: x('Life', 'Livet'),
    hint: x('Real choices you’ll argue about', 'Ekte valg dere vil krangle om'),
    dilemmas: [
      [
        x('Live in a big city', 'Bo i en storby'),
        x('Live in a cabin in the mountains', 'Bo på en hytte på fjellet'),
      ],
      [
        x('Have summer all year', 'Ha sommer hele året'),
        x('Have winter all year', 'Ha vinter hele året'),
      ],
      [x('Be famous', 'Være kjent'), x('Be rich and unknown', 'Være rik og ukjent')],
      [
        x('Travel to the past', 'Reise til fortiden'),
        x('Travel to the future', 'Reise til fremtiden'),
      ],
      [
        x('Always say what you think', 'Alltid si hva du tenker'),
        x('Never speak again', 'Aldri snakke igjen'),
      ],
      [
        x('Live without music', 'Leve uten musikk'),
        x('Live without films and series', 'Leve uten filmer og serier'),
      ],
      [
        x('Give up your phone for a month', 'Gi fra deg mobilen i en måned'),
        x('Give up cheese for a year', 'Droppe ost i et år'),
      ],
      [
        x('Have unlimited free flights', 'Ha ubegrenset med gratis flyreiser'),
        x('Have unlimited free food', 'Ha ubegrenset med gratis mat'),
      ],
      [
        x('Wake up at 5 every day', 'Våkne klokka 5 hver dag'),
        x('Go to bed at 9 every day', 'Legge deg klokka 21 hver dag'),
      ],
      [
        x('Be the funniest person in the room', 'Være den morsomste i rommet'),
        x('Be the smartest person in the room', 'Være den smarteste i rommet'),
      ],
      [
        x('Have a personal chef', 'Ha en privat kokk'),
        x('Have a personal driver', 'Ha en privat sjåfør'),
      ],
      [
        x('Live without social media', 'Leve uten sosiale medier'),
        x('Live without takeaway food', 'Leve uten takeaway'),
      ],
      [x('Win the lottery', 'Vinne i lotto'), x('Live twice as long', 'Leve dobbelt så lenge')],
      [
        x('Go on holiday to the beach', 'Dra på strandferie'),
        x('Go on holiday to the mountains', 'Dra på fjellferie'),
      ],
    ],
  },
  {
    name: x('Impossible', 'Umulige'),
    hint: x('Both options hurt. Choose anyway.', 'Begge valgene svir. Velg likevel.'),
    dilemmas: [
      [
        x('Know how you will die', 'Vite hvordan du skal dø'),
        x('Know when you will die', 'Vite når du skal dø'),
      ],
      [x('Read minds', 'Lese tanker'), x('See the future', 'Se inn i fremtiden')],
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
        x('Be able to fly but only one metre high', 'Kunne fly, men bare én meter over bakken'),
        x('Be invisible but only when nobody looks', 'Være usynlig, men bare når ingen ser på deg'),
      ],
      [
        x('Forget your best memory', 'Glemme ditt beste minne'),
        x('Relive your worst memory every year', 'Oppleve ditt verste minne på nytt hvert år'),
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
        x('Be a famous athlete', 'Være en kjent idrettsutøver'),
        x('Be a famous musician', 'Være en kjent musiker'),
      ],
      [
        x('Only drink coffee for a year', 'Bare drikke kaffe i et år'),
        x('Only drink tea for a year', 'Bare drikke te i et år'),
      ],
    ],
  },
];

export const PROMPTS = PACKS.map((pack, p) => [
  ...pack.dilemmas.map(([a, b], i) => ({ id: `wyr-legacy-${p}-${i}`, a, b })),
  ...PILOT.filter((prompt) => prompt.pack === p),
]);
