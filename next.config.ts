import type { NextConfig } from 'next';
// PGlite ships WebAssembly and data files that must load from node_modules.
const config: NextConfig = { experimental: { agentUpgrade: 'security' }, images: { unoptimized: true }, serverExternalPackages: ['@electric-sql/pglite'] };
export default config;
