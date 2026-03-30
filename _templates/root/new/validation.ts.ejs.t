---
to: <%= commonValidation %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
import { BadRequestException } from '@nestjs/common';
<% if (context.validation?.engineAccessExpression) { %><% if (context.validation.engineImportKind === 'default') { %>import <%= context.validation.engineImportName %> from '<%= context.validation.engineImportPath %>';
<% } else if (context.validation.engineImportKind === 'namespace') { %>import * as <%= context.validation.engineImportName %> from '<%= context.validation.engineImportPath %>';
<% } else if (context.validation.engineImportName !== context.validation.engineImportSourceName) { %>import { <%= context.validation.engineImportSourceName %> as <%= context.validation.engineImportName %> } from '<%= context.validation.engineImportPath %>';
<% } else { %>import { <%= context.validation.engineImportName %> } from '<%= context.validation.engineImportPath %>';
<% } %><% } %>

type ValidationResult =
  | { success: true; data: unknown }
  | { success: false; errors: unknown };

type ValidationContext = {
  schema: unknown;
  input: unknown;
};

type ValidationEngine = {
  validate: (context: ValidationContext) => ValidationResult;
};

type ZodLikeSchema = {
  safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: { issues?: unknown } };
};

const zodValidationEngine: ValidationEngine = {
  validate({ schema, input }: ValidationContext): ValidationResult {
    if (typeof schema !== 'object' || schema === null || !('safeParse' in schema) || typeof schema.safeParse !== 'function') {
      return {
        success: false,
        errors: 'The configured validation schema is not compatible with the built-in zod engine.',
      };
    }

    const result = (schema as ZodLikeSchema).safeParse(input);
    return result.success
      ? { success: true, data: result.data }
      : { success: false, errors: result.error?.issues ?? result.error };
  },
};

const validationEngine: ValidationEngine = <% if (context.validation?.engineAccessExpression) { %><%= context.validation.engineAccessExpression %><% } else { %>zodValidationEngine<% } %>;

export function validateResourceInput<T>(schema: unknown, input: T): T {
  if (!schema) {
    return input;
  }

  const result = validationEngine.validate({ schema, input });
  if (!result.success) {
    throw new BadRequestException(result.errors);
  }

  return result.data as T;
}
