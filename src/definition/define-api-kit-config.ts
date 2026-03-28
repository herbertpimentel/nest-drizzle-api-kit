import type { ApiKitConfig } from './types';

export const API_KIT_CONFIG_META_KEY = Symbol.for('nest-drizzle-api-kit/config-meta');

export function defineApiKitConfig<const T extends ApiKitConfig>(config: T): T {
  return config;
}
