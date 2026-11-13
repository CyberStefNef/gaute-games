import { connect, type GameState } from '@gaute/games-sdk/client';
import { createScene, type SceneController, type SceneNode } from '@gaute/games-sdk/scene3d';
import type { game } from './logic';
import type { ViewOf } from '@gaute/games-sdk/logic';
import meadow from './assets/meadow.glb';
import brewery from './assets/brewery.glb';
import brewer from './assets/brewer.glb';
import './style.css';
const REASONS: Record<string, string> = {
  'Wait for your turn.': 'Vent på din tur.',
  'Choose a neighbouring meadow.': 'Velg en naboeng.',
  'Choose a meadow.': 'Velg en eng.',
};
const root = document.getElementById('app')!;
root.innerHTML =
  '<main><header><span class="eyebrow">GAUTE / 3D</span><h1>Brewtown workshop</h1><p id="turn"></p></header><div id="world" role="application" aria-label="Brewtown 3D board" tabindex="0"></div><footer><p id="status" role="status">Loading models…</p><div class="controls"><button id="left" aria-label="Rotate camera left">↶</button><button id="reset">Reset camera</button><button id="right" aria-label="Rotate camera right">↷</button></div><p id="error" role="alert"></p></footer></main>';
const viewport = document.getElementById('world')!;
const status = document.getElementById('status')!;
const error = document.getElementById('error')!;
let scene: SceneController | undefined,
  latest: GameState<ViewOf<typeof game>> | undefined,
  angle = 0;
const center = (at: number): [number, number, number] => {
  const x = at % 3,
    y = Math.floor(at / 3);
  return [(x - 1) * 2.85, 0, (y - 1 + (x % 2) * 0.5) * 3.291];
};
const nodes = (): SceneNode[] => [
  ...Array.from({ length: 9 }, (_, at) => ({
    id: `tile-${at}`,
    model: 'meadow',
    position: center(at),
    rotation: [0, Math.PI / 12, 0] as const,
  })),
  { id: 'brewery', model: 'brewery', position: [-2.85, 0.02, -3.291] },
  {
    id: 'maker',
    model: 'brewer',
    position: center(latest?.snapshot.view.at ?? 4),
    scale: 1.4,
    animation: 'Idle',
    transitionMs: 650,
  },
];
function draw() {
  if (!latest) return;
  const { snapshot, locale } = latest;
  document.querySelector('h1')!.textContent =
    locale === 'nb' ? 'Brewtown-verksted' : 'Brewtown workshop';
  document
    .getElementById('left')!
    .setAttribute(
      'aria-label',
      locale === 'nb' ? 'Roter kameraet mot venstre' : 'Rotate camera left',
    );
  document
    .getElementById('right')!
    .setAttribute(
      'aria-label',
      locale === 'nb' ? 'Roter kameraet mot høyre' : 'Rotate camera right',
    );
  document.getElementById('reset')!.textContent =
    locale === 'nb' ? 'Tilbakestill kamera' : 'Reset camera';
  viewport.setAttribute('aria-label', locale === 'nb' ? 'Brewtown i 3D' : 'Brewtown 3D board');
  if (!scene) status.textContent = locale === 'nb' ? 'Laster modeller…' : 'Loading models…';
  const active =
    snapshot.players.find((p) => p.handle === snapshot.view.active)?.name ?? snapshot.view.active;
  document.getElementById('turn')!.textContent =
    snapshot.status === 'ended'
      ? locale === 'nb'
        ? 'Verkstedet er ferdig'
        : 'Workshop complete'
      : `${active} · ${snapshot.view.moves}/6`;
  if (!scene) return;
  void scene
    .update({
      nodes: nodes(),
      camera: {
        position: [
          Math.sin(angle) * 16 + Math.cos(angle) * 12,
          16,
          Math.cos(angle) * 16 - Math.sin(angle) * 12,
        ],
        target: [0, 0, 0],
        projection: 'orthographic',
        span: Math.max(17, (13 * viewport.clientHeight) / Math.max(1, viewport.clientWidth)),
      },
      background: latest.theme.dark ? '#241a2c' : '#ede5d6',
    })
    .catch((reason) => {
      error.textContent = String(reason);
    });
  status.textContent =
    locale === 'nb'
      ? 'Trykk på en naboeng for å flytte bryggeren.'
      : 'Tap a neighbouring meadow to move the brewer.';
}
const client = connect<typeof game>((state) => {
  latest = state;
  draw();
  // Menu labels follow the application's language after initialization.
  const nb = state.locale === 'nb';
  pause.textContent = nb ? 'Pause' : 'Pause';
  resume.textContent = nb ? 'Fortsett' : 'Resume';
  back.textContent = nb ? 'Tilbake til spill' : 'Back to games';
  back.hidden = !state.controls.includes('back');
});
// Plain-DOM games own the same navigation as React games.
const pause = document.createElement('button');
pause.textContent = 'Pause';
pause.style.cssText = 'position:fixed;top:8px;right:8px;min-width:44px;min-height:44px;z-index:10';
const menu = document.createElement('dialog');
menu.setAttribute('aria-label', 'Pause menu');
menu.style.cssText =
  'margin:auto;padding:20px;border-radius:16px;background:var(--card);color:var(--foreground)';
const resume = document.createElement('button');
resume.textContent = 'Resume';
resume.style.cssText = 'min-height:44px;min-width:100px';
resume.onclick = () => menu.close();
menu.append(resume);
const back = document.createElement('button');
back.textContent = 'Back to games';
back.style.cssText = 'min-height:44px;min-width:120px';
back.onclick = () => {
  void client.host('back');
};
menu.append(back);
root.append(pause, menu);
const toggleMenu = () => {
  if (menu.open) menu.close();
  else menu.showModal();
};
pause.onclick = toggleMenu;
client.onBack(toggleMenu);
let moving = false;
void createScene(viewport, {
  onPick: (pick) => {
    const at = pick.id?.startsWith('tile-') ? Number(pick.id.slice(5)) : null;
    if (at !== null && !moving) {
      moving = true;
      status.textContent = latest?.locale === 'nb' ? 'Flytter…' : 'Moving…';
      void client
        .act('move', { at })
        .then((result) => {
          error.textContent = result.ok
            ? ''
            : latest?.locale === 'nb'
              ? (REASONS[result.reason] ?? result.reason)
              : result.reason;
        })
        .finally(() => {
          moving = false;
          draw();
        });
    }
  },
  onError: (reason) => {
    error.textContent = reason;
  },
})
  .then(async (value) => {
    scene = value;
    await Promise.all([
      scene.load('meadow', meadow),
      scene.load('brewery', brewery),
      scene.load('brewer', brewer),
    ]);
    draw();
  })
  .catch((reason) => {
    error.textContent = String(reason);
    scene?.dispose();
    scene = undefined;
  });
document.getElementById('left')!.onclick = () => {
  angle -= Math.PI / 6;
  draw();
};
document.getElementById('right')!.onclick = () => {
  angle += Math.PI / 6;
  draw();
};
document.getElementById('reset')!.onclick = () => {
  angle = 0;
  draw();
};
viewport.onkeydown = (event) => {
  if (event.key === 'ArrowLeft') {
    angle -= Math.PI / 6;
    draw();
  }
  if (event.key === 'ArrowRight') {
    angle += Math.PI / 6;
    draw();
  }
};
addEventListener(
  'pagehide',
  () => {
    client.dispose();
    scene?.dispose();
  },
  { once: true },
);
