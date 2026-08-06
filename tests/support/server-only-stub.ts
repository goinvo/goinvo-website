/**
 * `server-only` is a build-time guard with no runtime implementation — Next
 * resolves it during bundling, and it does not exist under vitest. Aliasing it
 * to this empty module lets server modules be unit-tested directly instead of
 * every test file having to vi.doMock it before a dynamic import.
 */
export {}
