export const metadata = {
  title: 'GoInvo CMS',
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div style={{ margin: 0 }}>{children}</div>
}
