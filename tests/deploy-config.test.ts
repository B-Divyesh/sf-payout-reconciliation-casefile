import { describe, expect, it } from 'vitest';
import config from '../public/staticwebapp.config.json';

const deploymentConfig = config as {
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
  routes: { route: string; headers: Record<string, string> }[];
};

describe('static deployment response policy', () => {
  it('ships required browser isolation headers, a manifest MIME type, and immutable hashed-asset caching', () => {
    expect(deploymentConfig.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(deploymentConfig.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(deploymentConfig.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(deploymentConfig.mimeTypes['.webmanifest']).toBe('application/manifest+json');
    expect(deploymentConfig.routes.find((route) => route.route === '/assets/*')?.headers['Cache-Control']).toContain('immutable');
  });
});
