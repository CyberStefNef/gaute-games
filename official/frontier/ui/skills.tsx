import { useState } from 'react';
import { Button } from '../../_kit/ui';
import type { BrewView, Intents, Skill } from './contract';
import { useGame, useT } from './game';
import { Icon, type IconName } from './pieces';
import { CostChips, type Run } from './panel';

const BRANCHES = ['brewing', 'logistics', 'hospitality'] as const;
export const BRANCH_NAMES = {
  brewing: 'Brewing',
  logistics: 'Logistics',
  hospitality: 'Hospitality',
} as const;
const EMBLEMS: Record<string, IconName> = {
  hopcraft: 'growth',
  coldferment: 'skill',
  wildyeast: 'growth',
  barrelcraft: 'keg',
  wayfinding: 'route',
  cycleways: 'courier',
  coldchain: 'venue',
  cooperatives: 'contract',
  welcome: 'open',
  gardens: 'growth',
  tasting: 'keg',
  festivals: 'flag',
};
export function SkillTree({
  brew,
  intents,
  turn,
  run,
}: {
  brew: BrewView;
  intents: Intents;
  turn: boolean;
  run: Run;
}) {
  const t = useT(),
    { you, busy } = useGame(),
    skills = brew.skills;
  const [chosen, setChosen] = useState(
    () => skills.find((s) => s.state === 'open')?.id ?? skills[0]?.id,
  );
  if (!skills.length) return <p>{t('No skills to learn yet.')}</p>;
  const byId = new Map(skills.map((s) => [s.id, s]));
  const skill = byId.get(chosen) ?? skills[0];
  const depthOf = (s: Skill): number =>
    s.requires.length
      ? 1 + Math.max(...s.requires.map((id) => (byId.has(id) ? depthOf(byId.get(id)!) : -1)))
      : 0;
  const blocked =
    skill.state === 'known'
      ? null
      : !you
        ? t('Only players can learn skills.')
        : !turn
          ? t.text(
              brew.simultaneous ? 'You are ready. Wait for the next round.' : 'Wait for your turn.',
            )
          : skill.state === 'locked'
            ? t('Learn {skill} first.', {
                skill: skill.requires.map((id) => t.text(byId.get(id)?.title ?? id)).join(', '),
              })
            : skill.blocked
              ? t.text(skill.blocked)
              : null;
  const chooseBranch = (branch: (typeof BRANCHES)[number]) =>
    setChosen(
      skills.find((s) => s.branch === branch && s.state === 'open')?.id ??
        skills.find((s) => s.branch === branch)!.id,
    );
  const known = skills.filter((s) => s.state === 'known').length;
  return (
    <div className="fr-research">
      <div className="fr-research-summary">
        <span>{t('{known} of {total} skills learned.', { known, total: skills.length })}</span>
        <span className="fr-research-meter" aria-hidden="true">
          <span style={{ width: `${(known / skills.length) * 100}%` }} />
        </span>
      </div>
      <div className="fr-research-switch" role="group" aria-label={t('Skill tree')}>
        {BRANCHES.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={b === skill.branch}
            onClick={() => chooseBranch(b)}
          >
            {t.text(BRANCH_NAMES[b])}
          </button>
        ))}
      </div>
      <div className="fr-research-lanes">
        {BRANCHES.map((branch) => {
          const visible = skills.filter((s) => s.branch === branch),
            rows = Math.max(...visible.map(depthOf)) + 1,
            height = rows * 88;
          const positions = new Map(
            visible.map((s) => {
              const peers = visible.filter((v) => depthOf(v) === depthOf(s));
              return [
                s.id,
                {
                  x: peers.length === 1 ? 110 : 57 + peers.findIndex((v) => v.id === s.id) * 106,
                  y: 6 + depthOf(s) * 88,
                },
              ];
            }),
          );
          return (
            <div
              key={branch}
              className="fr-research-lane"
              data-active={branch === skill.branch}
              role="group"
              aria-label={t.text(BRANCH_NAMES[branch])}
            >
              <button
                type="button"
                className="fr-research-lane-title"
                onClick={() => chooseBranch(branch)}
              >
                {t.text(BRANCH_NAMES[branch])}
                <small>
                  {visible.filter((s) => s.state === 'known').length}/{visible.length}
                </small>
              </button>
              <div className="fr-research-path" style={{ height }}>
                <svg viewBox={`0 0 220 ${height}`} preserveAspectRatio="none" aria-hidden="true">
                  {visible.flatMap((s) =>
                    s.requires
                      .filter((id) => positions.has(id))
                      .map((id) => {
                        const a = positions.get(id)!,
                          b = positions.get(s.id)!;
                        return (
                          <path
                            key={`${id}-${s.id}`}
                            className={`fr-research-link ${byId.get(id)?.state === 'known' ? 'learned' : ''}`}
                            d={`M${a.x} ${a.y + 72} V${b.y - 8} H${b.x} V${b.y}`}
                          />
                        );
                      }),
                  )}
                </svg>
                {visible.map((s) => {
                  const p = positions.get(s.id)!;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`fr-research-node ${s.state}`}
                      style={{ left: `${(p.x / 220) * 100}%`, top: p.y }}
                      aria-pressed={s.id === skill.id}
                      aria-label={`${t.text(s.title)}, ${t(s.state === 'known' ? 'Learned' : s.state === 'locked' ? 'Locked' : 'Available')}`}
                      onClick={() => setChosen(s.id)}
                    >
                      <span className="fr-research-seal">
                        <Icon name={EMBLEMS[s.id] ?? 'skill'} className="size-5" />
                        {s.state === 'known' && (
                          <span className="fr-research-check">
                            <Icon name="check" className="size-3" />
                          </span>
                        )}
                      </span>
                      <span className="fr-research-name">{t.text(s.title)}</span>
                      <span className="fr-research-price">
                        {s.state === 'known' ? (
                          t('Learned')
                        ) : (
                          <>
                            <Icon name="skill" className="size-3" />
                            {s.cost.knowledge ?? 0}
                            <span>·</span>
                            <Icon name="coins" className="size-3" />
                            {s.cost.coins ?? 0}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <section className="fr-research-detail" aria-live="polite">
        <div className="fr-research-heading">
          <h3>{t.text(skill.title)}</h3>
          {skill.state === 'known' ? (
            <span className="fr-research-complete">
              <Icon name="check" className="size-4" />
              {t('Learned')}
            </span>
          ) : (
            <Button
              primary
              disabled={Boolean(blocked) || busy}
              onClick={() => run(intents.learn?.(skill.id))}
              aria-label={t('Learn {skill}', { skill: t.text(skill.title) })}
            >
              <span className="inline-flex items-center gap-2">
                {t('Learn')}
                <CostChips cost={skill.cost} brew={brew} />
              </span>
            </Button>
          )}
        </div>
        <ul className="fr-research-unlocks">
          {skill.unlocks.map((u) => (
            <li key={u}>
              <Icon name="plus" className="size-4" />
              <span>{t.text(u)}</span>
            </li>
          ))}
        </ul>
        {blocked && <p className="fr-research-blocked">{blocked}</p>}
        {skill.state === 'locked' && (
          <div className="fr-research-requires">
            {skill.requires.map((id) => (
              <button key={id} type="button" onClick={() => setChosen(id)}>
                <Icon
                  name={byId.get(id)?.state === 'known' ? 'check' : 'lock'}
                  className="size-3"
                />
                {t.text(byId.get(id)?.title ?? id)}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
