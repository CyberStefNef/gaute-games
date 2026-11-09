import { connect, type GameState } from '@gaute/games-sdk/client';

// A game page can use any web framework or canvas. This one uses plain DOM.
// The app provides its theme as CSS variables (--background, --primary, …).
type View = {
  guesses: { player: string | null; value: number; hint: string }[];
  yourTurn: boolean;
  next: string;
  winner: string | null;
  secret: number | null;
};

const css = document.createElement('style');
css.textContent = `
  main { max-width: 520px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
  h1 { margin: 0; font-size: 24px; }
  form { display: flex; gap: 8px; }
  input { flex: 1; font: inherit; padding: 12px; border-radius: var(--radius); border: 1px solid var(--input); background: var(--card); color: var(--foreground); }
  button { font: inherit; font-weight: 600; padding: 12px 16px; border-radius: var(--radius); border: 0; background: var(--primary); color: var(--primary-foreground); }
  li { padding: 4px 0; color: var(--muted-foreground); }
`;
document.head.append(css);
const root = document.getElementById('app')!;

const game = connect((state: GameState) => {
  const view = state.snapshot.view as View;
  const name = (handle: string | null) =>
    state.snapshot.players.find((p) => p.handle === handle)?.name ?? 'The group';
  const main = document.createElement('main');
  const title = document.createElement('h1');
  title.textContent = view.winner
    ? `${name(view.winner === 'group' ? null : view.winner)} found ${view.secret}!`
    : view.yourTurn
      ? 'Your guess'
      : `${name(view.next)} is guessing`;
  main.append(title);
  if (!view.winner && view.yourTurn) {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '100';
    input.placeholder = '1–100';
    const button = document.createElement('button');
    button.textContent = 'Guess';
    form.append(input, button);
    form.onsubmit = async (event) => {
      event.preventDefault();
      game.haptic('selection');
      const result = await game.act('guess', { value: Number(input.value) });
      if (!result.ok) title.textContent = result.reason;
    };
    main.append(form);
  }
  const list = document.createElement('ol');
  for (const guess of [...view.guesses].reverse()) {
    const item = document.createElement('li');
    item.textContent = `${name(guess.player)}: ${guess.value} → ${guess.hint}`;
    list.append(item);
  }
  main.append(list);
  root.replaceChildren(main);
});
