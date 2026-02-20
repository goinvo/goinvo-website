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
      <Header />
      <PersistentHero />
      <TransitionLayout>
        <main>{children}</main>
      </TransitionLayout>
    </HeroProvider>
  )
}
