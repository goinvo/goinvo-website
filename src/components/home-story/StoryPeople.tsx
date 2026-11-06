'use client'

/**
 * "What we saw": three people, one screen each, pinned while you scroll.
 * Each scene is told in the same order, so the reader learns the shape once:
 *   who → what they were up against → the number that moved → the case study.
 * The chapter list on the left fills as you go, so nobody wonders how much is left.
 */

import Image from 'next/image'
import Link from 'next/link'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { Beat, Reveal, ScrubNumber, StickyStage } from './storyMotion'
import { peopleScenes, type PeopleScene } from './storyContent'

const SCENES = peopleScenes.length

function Arrow() {
  return (
    <svg className="hs-arrow" width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Where scene i sits in the stage's 0 → 1 progress. */
function window_(i: number) {
  const start = i / SCENES
  const end = (i + 1) / SCENES
  const first = i === 0
  const last = i === SCENES - 1
  return {
    start,
    end,
    // The first scene is already up when the stage pins, so the section never
    // scrolls in empty. The last one stays until the stage lets go.
    enter: first ? 0 : start + 0.01,
    hold: first ? 0 : start + 0.07,
    exit: last ? undefined : end - 0.07,
    gone: last ? undefined : end - 0.01,
    // The count finishes early in the scene, so a reader who stops to read the
    // sentence is looking at the real number, not one on its way there.
    countFrom: start + (first ? 0.01 : 0.06),
    countTo: start + (first ? 0.09 : 0.14),
  }
}

function Outcome({ scene, progress, at }: { scene: PeopleScene; progress?: MotionValue<number>; at?: [number, number] }) {
  return (
    <p className="hs-serif m-0 leading-none text-[var(--hs-accent)] text-[clamp(3.2rem,min(6vw,9svh),5.6rem)] tracking-[-0.03em]">
      {scene.prefix && <span className="text-[var(--hs-muted)]">{scene.prefix}</span>}
      {progress && at ? (
        <ScrubNumber progress={progress} enter={at[0]} hold={at[1]} from={scene.from} to={scene.to} />
      ) : (
        scene.to
      )}
      <span className="text-[0.55em] align-top">{scene.suffix}</span>
    </p>
  )
}

function ChapterRow({ scene, index, progress }: { scene: PeopleScene; index: number; progress: MotionValue<number> }) {
  const { start, end } = window_(index)
  const fill = useTransform(progress, [start, end], [0, 1])
  const ink = useTransform(progress, (p) => (p >= start - 0.001 && (p < end || index === SCENES - 1) ? 1 : 0.4))
  return (
    <motion.li style={{ opacity: ink }} className="relative py-3">
      <span className="flex items-baseline gap-3 text-[14px] font-semibold">
        <span className="tabular-nums text-[var(--hs-muted)]">{String(index + 1).padStart(2, '0')}</span>
        {scene.client}
      </span>
      <span className="absolute inset-x-0 bottom-0 h-px bg-[var(--hs-rule)]" />
      <motion.span style={{ scaleX: fill }} className="absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--hs-ink)]" />
    </motion.li>
  )
}

function SceneImage({ scene, index, progress }: { scene: PeopleScene; index: number; progress: MotionValue<number> }) {
  const { start } = window_(index)
  // Each picture is laid over the last, uncovered from the bottom, so the
  // change of scene is a page turning rather than a cut.
  // (Offsets are kept inside 0..1; see Beat.)
  const top = useTransform(progress, index === 0 ? [0, 1] : [start - 0.03, start + 0.07], index === 0 ? [0, 0] : [100, 0])
  const clipPath = useTransform(top, (v) => `inset(${v}% 0 0 0)`)
  const scale = useTransform(progress, [Math.max(0, start - 0.03), start + 0.33], [1.08, 1])
  return (
    <motion.div style={{ clipPath }} className="hs-scene-image absolute inset-0 overflow-hidden bg-[#ece7dc]">
      <motion.div style={{ scale }} className="absolute inset-0">
        <Image src={scene.image} alt={scene.alt} fill sizes="(min-width: 900px) 52vw, 100vw" className="object-cover" />
      </motion.div>
    </motion.div>
  )
}

function PeopleStage({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="h-full bg-[var(--hs-cream)]">
      <div className="mx-auto grid h-full max-w-[1280px] grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-16 px-14">
        <div className="flex h-full flex-col justify-center">
          <p className="hs-eyebrow text-[var(--hs-accent)]">What we saw</p>
          <ol className="mt-5 max-w-[360px]">
            {peopleScenes.map((scene, i) => (
              <ChapterRow key={scene.id} scene={scene} index={i} progress={progress} />
            ))}
          </ol>

          <div className="relative mt-8 min-h-[440px]">
            {peopleScenes.map((scene, i) => {
              const w = window_(i)
              return (
                <Beat
                  key={scene.id}
                  progress={progress}
                  enter={w.enter}
                  hold={w.hold}
                  exit={w.exit}
                  gone={w.gone}
                  from="bottom"
                  className="absolute inset-x-0 top-0"
                >
                  <p className="hs-eyebrow text-[var(--hs-muted)]">
                    {scene.client} · {scene.context}
                  </p>
                  <h3 className="hs-serif mt-4 max-w-[22ch] text-[clamp(1.8rem,2.7vw,2.5rem)] leading-[1.12] tracking-[-0.015em]">
                    {scene.observation}
                  </h3>
                  <p className="mt-3 max-w-[44ch] text-[17px] leading-[1.6] text-[var(--hs-ink-2)]">{scene.detail}</p>
                  <div className="mt-6 border-t border-[var(--hs-ink)] pt-5">
                    <Outcome scene={scene} progress={progress} at={[w.countFrom, w.countTo]} />
                    <p className="mt-3 max-w-[40ch] text-[16px] leading-[1.55] text-[var(--hs-ink-2)]">{scene.result}</p>
                    <Link href={scene.href} className="hs-link mt-5">
                      Read the case study <Arrow />
                    </Link>
                  </div>
                </Beat>
              )
            })}
          </div>
        </div>

        <div className="relative aspect-[4/5] max-h-[calc(100svh-var(--hs-header)-120px)] w-full">
          {peopleScenes.map((scene, i) => (
            <SceneImage key={scene.id} scene={scene} index={i} progress={progress} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function StoryPeople() {
  return (
    <section id="people" data-story-chapter="people" aria-label="What we saw">
      <div className="hs-staged">
        <StickyStage height={420} label="What we saw: three projects">
          {(progress) => <PeopleStage progress={progress} />}
        </StickyStage>
      </div>

      <div className="hs-flowing bg-[var(--hs-cream)] pb-10">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <p className="hs-eyebrow text-[var(--hs-accent)]">What we saw</p>
          {peopleScenes.map((scene, i) => (
            <Reveal key={scene.id} className="hs-rise border-t border-[var(--hs-rule)] py-12 first:mt-6">
              <p className="hs-eyebrow text-[var(--hs-muted)]">
                {String(i + 1).padStart(2, '0')} · {scene.client}
              </p>
              <h3 className="hs-serif mt-4 text-[clamp(1.7rem,6vw,2.4rem)] leading-[1.12]">{scene.observation}</h3>
              <p className="mt-3 text-[17px] leading-[1.6] text-[var(--hs-ink-2)]">{scene.detail}</p>
              <div className="relative mt-7 aspect-[4/3] overflow-hidden bg-[#ece7dc]">
                <Image src={scene.image} alt={scene.alt} fill sizes="100vw" className="object-cover" />
              </div>
              <div className="mt-7">
                <Outcome scene={scene} />
                <p className="mt-3 text-[16px] leading-[1.55] text-[var(--hs-ink-2)]">{scene.result}</p>
                <Link href={scene.href} className="hs-link mt-5">
                  Read the case study <Arrow />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
