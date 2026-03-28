import { DynamicModule, Module } from '@nestjs/common';
import type { ApiKitModuleOptions } from '../definition/types';

export const API_KIT_OPTIONS = Symbol('API_KIT_OPTIONS');

@Module({})
export class ApiKitModule {
  static forRoot(options: ApiKitModuleOptions): DynamicModule {
    return {
      module: ApiKitModule,
      providers: [
        {
          provide: API_KIT_OPTIONS,
          useValue: options,
        },
      ],
      exports: [API_KIT_OPTIONS],
      global: true,
    };
  }
}
