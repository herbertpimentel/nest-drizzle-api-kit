import { getTableColumns } from 'drizzle-orm';
import type { InputDtoDefinition, ParamsDtoDefinition, ResponseDtoDefinition, ResourceDefinition } from '../definition/types';

type DrizzleColumn = {
  name: string;
  dataType?: string;
  columnType?: string;
  enumValues?: string[] | undefined;
  notNull?: boolean;
  hasDefault?: boolean;
  primary?: boolean;
};

type TableColumnsInput = Parameters<typeof getTableColumns>[0];

export type GeneratedDtoField = {
  name: string;
  columnName: string;
  tsType: string;
  createTsType: string;
  responseTsType: string;
  swaggerType: 'String' | 'Number' | 'Boolean' | 'Object';
  swaggerOptions: string[];
  optional: boolean;
  nullable: boolean;
};

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function doubleQuote(value: string): string {
  return JSON.stringify(value);
}

function tsTypeForColumn(column: DrizzleColumn): string {
  if (column.enumValues && column.enumValues.length > 0) {
    return column.enumValues.map(quote).join(' | ');
  }

  switch (column.dataType) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'Date';
    case 'bigint':
      return 'bigint';
    case 'buffer':
      return 'Buffer';
    case 'array':
      if (column.columnType === 'PgVector' || column.columnType === 'PgHalfVector') {
        return 'number[]';
      }
      return 'unknown[]';
    case 'json':
    case 'custom':
      return 'unknown';
    default:
      return 'unknown';
  }
}

function swaggerTypeForColumn(column: DrizzleColumn): GeneratedDtoField['swaggerType'] {
  switch (column.dataType) {
    case 'number':
    case 'bigint':
      return 'Number';
    case 'boolean':
      return 'Boolean';
    case 'json':
    case 'custom':
    case 'buffer':
    case 'array':
      return 'Object';
    default:
      return 'String';
  }
}

function swaggerOptionsForColumn(column: DrizzleColumn): string[] {
  const options: string[] = [];

  if (column.enumValues && column.enumValues.length > 0) {
    options.push(`enum: [${column.enumValues.map(doubleQuote).join(', ')}]`);
  }

  switch (column.dataType) {
    case 'date':
      options.push(`type: String`);
      options.push(`format: ${doubleQuote('date-time')}`);
      break;
    case 'bigint':
      options.push(`type: String`);
      break;
    case 'buffer':
      options.push(`type: String`);
      options.push(`format: 'binary'`);
      break;
    case 'array':
      options.push('isArray: true');
      if (column.columnType === 'PgVector' || column.columnType === 'PgHalfVector') {
        options.push('type: Number');
      }
      break;
    case 'json':
    case 'custom':
      options.push('type: Object');
      break;
  }

  return options;
}

function primaryColumn(resource: ResourceDefinition): [string, DrizzleColumn] | null {
  const columns = Object.entries(getTableColumns(resource.table as TableColumnsInput));
  return columns.find(([, column]) => Boolean((column as DrizzleColumn).primary))
    ?? columns.find(([name]) => name === 'id')
    ?? null;
}

function shouldIncludeField(name: string, include?: string[], exclude?: string[]): boolean {
  if (include && include.length > 0 && !include.includes(name)) {
    return false;
  }

  if (exclude?.includes(name)) {
    return false;
  }

  return true;
}

function createField(
  name: string,
  column: DrizzleColumn,
  optional: boolean,
  nullable: boolean,
): GeneratedDtoField {
  const baseType = tsTypeForColumn(column);
  return {
    name,
    columnName: column.name,
    tsType: baseType,
    createTsType: nullable ? `${baseType} | null` : baseType,
    responseTsType: nullable ? `${baseType} | null` : baseType,
    swaggerType: swaggerTypeForColumn(column),
    swaggerOptions: swaggerOptionsForColumn(column),
    optional,
    nullable,
  };
}

export function buildCreateDtoFields(resource: ResourceDefinition): GeneratedDtoField[] {
  const config = resource.dto?.create;
  if (config?.mode === 'custom') {
    return [];
  }

  const forcedRequired = new Set(config?.required ?? []);
  const forcedOptional = new Set(config?.optional ?? []);

  return Object.entries(getTableColumns(resource.table as TableColumnsInput))
    .filter(([name]) => shouldIncludeField(name, config?.include, config?.exclude))
    .map(([name, column]) => {
      const meta = column as DrizzleColumn;
      const nullable = !Boolean(meta.notNull);
      let optional = !meta.notNull || Boolean(meta.hasDefault) || Boolean(meta.primary);

      if (forcedRequired.has(name)) {
        optional = false;
      }

      if (forcedOptional.has(name)) {
        optional = true;
      }

      return createField(name, meta, optional, nullable);
    });
}

export function buildResponseDtoFields(resource: ResourceDefinition): GeneratedDtoField[] {
  const config: ResponseDtoDefinition | undefined = resource.dto?.response;
  if (config?.mode === 'custom') {
    return [];
  }

  return Object.entries(getTableColumns(resource.table as TableColumnsInput))
    .filter(([name]) => shouldIncludeField(name, config?.include, config?.exclude))
    .map(([name, column]) => {
      const meta = column as DrizzleColumn;
      return createField(name, meta, false, !Boolean(meta.notNull));
    });
}

export function buildIdParamField(resource: ResourceDefinition): GeneratedDtoField | null {
  const config: ParamsDtoDefinition | undefined = resource.dto?.findOne;
  if (config?.mode === 'custom') {
    return null;
  }

  const primary = primaryColumn(resource);
  if (!primary) {
    return null;
  }

  const [name, column] = primary;
  return createField(name, column, false, false);
}
