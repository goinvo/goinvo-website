import { HomeConceptCalendlyCta } from '@/components/home/HomeConceptCalendlyCta'
import { StoryOpening } from './StoryOpening'
import { StoryPeople } from './StoryPeople'
import { StoryOpenSource, StoryProof, StoryRail, StoryServices, StoryStudio, StoryTestimonial } from './StorySections'
import './home-story.css'
import { HumanHome } from './HumanHome'

/**
 * The homepage told as a story (direction D), using FELINES' grammar: one idea
 * per screen, scroll as the narrator, detail on demand, and a visible sense of
 * where you are. Copy lives in storyContent.ts; motion primitives in storyMotion.tsx.
 */
export function HomeStory({ teamMembers, variant = 'story', work }: { teamMembers: { name: string; image: string }[]; variant?: 'story' | 'human'; work?: string }) {
  if (variant === 'human') return <HumanHome work={work} />

  return (
    <div className="hs">
      <StoryRail />
      <StoryOpening />
      <StoryPeople />
      <StoryServices />
      <StoryProof />
      <StoryOpenSource />
      <StoryTestimonial />
      <StoryStudio members={teamMembers} />
      <HomeConceptCalendlyCta />
    </div>
  )
}
