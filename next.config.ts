import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Argon2 es un módulo nativo: se carga en tiempo de ejecución, no se empaqueta.
  serverExternalPackages: ['@node-rs/argon2'],
};

export default nextConfig;
