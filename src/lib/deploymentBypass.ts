const deploymentBypassParams = [
  'x-vercel-protection-bypass',
  'x-vercel-set-bypass-cookie',
] as const

// Protected Vercel preview links rely on these params; keep them on
// in-preview mutations and redirects so iframe-based Presentation still works.
export function withDeploymentBypassParams(path: string): string {
  const currentUrl = new URL(window.location.href)
  const targetUrl = new URL(path, window.location.origin)

  for (const param of deploymentBypassParams) {
    const value = currentUrl.searchParams.get(param)
    if (value) {
      targetUrl.searchParams.set(param, value)
    }
  }

  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
}
