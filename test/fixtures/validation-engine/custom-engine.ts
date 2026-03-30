import type { ValidationEngine } from '../../../src';

export const customValidationEngine: ValidationEngine = {
  validate({ schema, input }) {
    if (typeof schema !== 'object' || schema === null || !('parse' in schema)) {
      return {
        success: true as const,
        data: input,
      };
    }

    return {
      success: true as const,
      data: input,
    };
  },
};
