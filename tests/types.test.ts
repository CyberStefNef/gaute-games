// Compile-time guarantees of the SDK: `vp check` fails if any of the marked
// lines stops being an error, or any unmarked line becomes one.
import { expect, expectTypeOf, test } from 'vite-plus/test';
import type { ActionName, PayloadOf, ViewOf } from '../sdk/logic.ts';
import type { game as imposter } from '../games/imposter/logic.ts';
import type { game as template } from '../template/logic.ts';
import { gameClient, useStrings } from '../sdk/react.tsx';

test('actions, payloads and views are inferred from the rules', () => {
  expectTypeOf<ActionName<typeof imposter>>().toEqualTypeOf<
    'seen' | 'startVote' | 'vote' | 'accuse' | 'reveal' | 'nextRound'
  >();
  expectTypeOf<PayloadOf<typeof imposter, 'vote'>>().toEqualTypeOf<{ target: string }>();
  expectTypeOf<PayloadOf<typeof imposter, 'startVote'>>().toEqualTypeOf<null>();
  expectTypeOf<ViewOf<typeof imposter>['role']>().toEqualTypeOf<'imposter' | 'crew' | null>();
  expectTypeOf<PayloadOf<typeof template, 'guess'>>().toEqualTypeOf<{ value: number }>();
});

test('a page can only send the game’s actions with their payloads', () => {
  const { useGame } = gameClient<typeof imposter>();
  // Never called: the checks are made by TypeScript.
  const page = () => {
    const { act, view } = useGame();
    void act('startVote');
    void act('vote', { target: 'p2' });
    // @ts-expect-error unknown action
    void act('vot', { target: 'p2' });
    // @ts-expect-error the payload is missing
    void act('vote');
    // @ts-expect-error the payload has the wrong shape
    void act('vote', { target: 2 });
    // @ts-expect-error actions without a payload take none
    void act('startVote', { target: 'p2' });
    // @ts-expect-error not part of the view
    void view.word.secret;
  };
  expect(typeof page).toBe('function');
});

test('translations check their keys and placeholders', () => {
  const page = () => {
    const t = useStrings({
      en: { 'Round {n}': 'Round {n}', Votes: 'Votes' },
      nb: { 'Round {n}': 'Runde {n}', Votes: 'Stemmer' },
    });
    t('Votes');
    t('Round {n}', { n: 2 });
    // @ts-expect-error unknown key
    t('Vote');
    // @ts-expect-error the placeholder value is missing
    t('Round {n}');
    // @ts-expect-error wrong placeholder name
    t('Round {n}', { round: 2 });
    // Text from the rules at runtime goes through `text`.
    t.text('Voting is not open.');
    // @ts-expect-error nb must translate every key
    useStrings({ en: { Votes: 'Votes' }, nb: {} });
  };
  expect(typeof page).toBe('function');
});
