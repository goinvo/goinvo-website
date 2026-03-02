import { Header } from '@/components/layout/Header'
import { TransitionLayout } from '@/components/layout/TransitionLayout'
import { HeroProvider } from '@/context/HeroContext'
import { PersistentHero } from '@/components/layout/PersistentHero'

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <HeroProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:no-underline"
      >
        Skip to content
      </a>
      <Header />
      <PersistentHero />
      <TransitionLayout>
        <main id="main-content">{children}</main>
      </TransitionLayout>
    </HeroProvider>
  )
}
