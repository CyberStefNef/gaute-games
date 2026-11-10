import { execFileSync } from 'node:child_process';
import { expect, test } from 'vite-plus/test';
import { ROOT } from '../tools/games.mjs';

test('a game built inside a development process uses JSX calls supported by production React', () => {
  // The live simulator invokes the same bundler while NODE_ENV is development.
  // The broken bundle built successfully, but crashed on first render because
  // production react/jsx-dev-runtime has no jsxDEV export.
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { bundleGame } from './tools/games.mjs';
    const game = await bundleGame('frontier');
    console.log(JSON.stringify({ developmentCalls: game.client.script.includes('.jsxDEV'), bytes: game.client.script.length }));
  `,
    ],
    { cwd: ROOT, env: { ...process.env, NODE_ENV: 'development' }, encoding: 'utf8' },
  );
  expect(JSON.parse(output.trim())).toMatchObject({ developmentCalls: false });
});
