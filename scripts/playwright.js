// Loads Playwright from the project or from the global npm prefix (dev tooling only; not a dependency).
export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const { execSync } = await import('node:child_process');
    const { createRequire } = await import('node:module');
    const root = execSync('npm root -g').toString().trim();
    return createRequire(root + '/')('playwright');
  }
}
