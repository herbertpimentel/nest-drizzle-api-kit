import type { NormalizedResourceDefinition } from '../compiler/models';

export type ControllerImportConfig = {
  commonImports: string[];
  guardDecorator: string | null;
  hasGuardImport: boolean;
  usesBigIntIdParser: boolean;
  usesIdParamsDtoImport: boolean;
  usesNumberIdPipe: boolean;
};

export function buildControllerImportConfig(resource: NormalizedResourceDefinition): ControllerImportConfig {
  const guardNames = resource.guards.resource?.map((guard) => guard.name).filter(Boolean) ?? [];
  const idTsType = resource.generatedDtos.idField?.tsType ?? 'string';
  const usesNumberIdPipe = idTsType === 'number';
  const usesBigIntIdParser = idTsType === 'bigint';
  const commonImports = ['Controller', 'Get', 'Post', 'Patch', 'Delete', 'Body', 'Param', 'Query', 'HttpCode'];

  if (guardNames.length > 0) {
    commonImports.push('UseGuards');
  }

  if (usesNumberIdPipe) {
    commonImports.push('ParseIntPipe');
  }

  if (usesBigIntIdParser) {
    commonImports.push('BadRequestException');
  }

  return {
    commonImports,
    guardDecorator: guardNames.length > 0 ? `@UseGuards(${guardNames.join(', ')})` : null,
    hasGuardImport: Boolean(resource.original.route?.tag && guardNames.length > 0),
    usesBigIntIdParser,
    usesIdParamsDtoImport: !usesNumberIdPipe && !usesBigIntIdParser,
    usesNumberIdPipe,
  };
}
