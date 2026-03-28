import type { GeneratedResourceRuntimeContext } from '../common/generated-resource.types';

export class GeneratedCreateHandler<TCreateDto = unknown, TResponseDto = unknown> {
  constructor(private readonly context: GeneratedResourceRuntimeContext) {}

  async execute(body: TCreateDto): Promise<TResponseDto> {
    const rows = await this.context.db.insert(this.context.table).values(body).returning();
    return (rows[0] ?? body) as TResponseDto;
  }
}
