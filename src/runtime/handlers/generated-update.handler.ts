import { eq, getTableColumns } from 'drizzle-orm';
import type { GeneratedResourceRuntimeContext } from '../common/generated-resource.types';

type TableColumnsInput = Parameters<typeof getTableColumns>[0];

export class GeneratedUpdateHandler<TUpdateDto = unknown, TResponseDto = unknown> {
  constructor(private readonly context: GeneratedResourceRuntimeContext) {}

  async execute(id: string, body: TUpdateDto): Promise<TResponseDto> {
    const columns = getTableColumns(this.context.table as TableColumnsInput);
    const primaryKeyColumn = columns[this.context.primaryKeyField] as any;
    const rows = await (this.context.db as any)
      .update(this.context.table)
      .set(body)
      .where((eq as any)(primaryKeyColumn, id))
      .returning();

    return (rows[0] ?? body) as TResponseDto;
  }
}
