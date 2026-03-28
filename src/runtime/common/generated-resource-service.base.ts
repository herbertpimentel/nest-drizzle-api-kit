import { getTableColumns } from 'drizzle-orm';
import type { ApiKitModuleOptions, ResourceDefinition } from '../../definition/types';
import { GeneratedCreateHandler } from '../handlers/generated-create.handler';
import { GeneratedDeleteHandler } from '../handlers/generated-delete.handler';
import { GeneratedFindHandler } from '../handlers/generated-find.handler';
import { GeneratedFindOneHandler } from '../handlers/generated-find-one.handler';
import { GeneratedUpdateHandler } from '../handlers/generated-update.handler';
import type { GeneratedResourceRuntimeContext, PaginatedResult } from './generated-resource.types';

function resolveResourceDefinition(options: ApiKitModuleOptions, resourceName: string): ResourceDefinition {
  const resource = options.resources.find(
    (entry): entry is ResourceDefinition => typeof entry !== 'string' && entry.name === resourceName,
  );

  if (!resource) {
    throw new Error(`Resource "${resourceName}" was not found in ApiKitModule options.`);
  }

  return resource;
}

function resolvePrimaryKeyField(resource: ResourceDefinition): string {
  const columns = getTableColumns(resource.table as Parameters<typeof getTableColumns>[0]);
  return (
    Object.entries(columns).find(([, column]) => Boolean((column as { primary?: boolean }).primary))?.[0]
    ?? (Object.prototype.hasOwnProperty.call(columns, 'id') ? 'id' : Object.keys(columns)[0])
    ?? 'id'
  );
}

export abstract class GeneratedResourceServiceBase<
  TFindQuery extends Record<string, unknown> = Record<string, unknown>,
  TCreateDto = unknown,
  TUpdateDto = unknown,
  TResponseDto = unknown,
> {
  protected readonly runtime: GeneratedResourceRuntimeContext;
  protected readonly findHandler: GeneratedFindHandler<TFindQuery, TResponseDto>;
  protected readonly findOneHandler: GeneratedFindOneHandler<TResponseDto>;
  protected readonly createHandler: GeneratedCreateHandler<TCreateDto, TResponseDto>;
  protected readonly updateHandler: GeneratedUpdateHandler<TUpdateDto, TResponseDto>;
  protected readonly deleteHandler: GeneratedDeleteHandler;

  protected constructor(options: ApiKitModuleOptions, resourceName: string) {
    if (!options.db) {
      throw new Error('ApiKitModule options must provide a Drizzle instance in "db".');
    }

    const resource = resolveResourceDefinition(options, resourceName);
    this.runtime = {
      db: options.db,
      resource,
      table: resource.table,
      primaryKeyField: resolvePrimaryKeyField(resource),
    };

    this.findHandler = new GeneratedFindHandler<TFindQuery, TResponseDto>(this.runtime);
    this.findOneHandler = new GeneratedFindOneHandler<TResponseDto>(this.runtime);
    this.createHandler = new GeneratedCreateHandler<TCreateDto, TResponseDto>(this.runtime);
    this.updateHandler = new GeneratedUpdateHandler<TUpdateDto, TResponseDto>(this.runtime);
    this.deleteHandler = new GeneratedDeleteHandler(this.runtime);
  }

  async find(query: TFindQuery): Promise<PaginatedResult<TResponseDto>> {
    return this.findHandler.execute(query);
  }

  async findOne(id: string): Promise<TResponseDto> {
    return this.findOneHandler.execute(id);
  }

  async create(body: TCreateDto): Promise<TResponseDto> {
    return this.createHandler.execute(body);
  }

  async update(id: string, body: TUpdateDto): Promise<TResponseDto> {
    return this.updateHandler.execute(id, body);
  }

  async delete(id: string): Promise<void> {
    return this.deleteHandler.execute(id);
  }
}
