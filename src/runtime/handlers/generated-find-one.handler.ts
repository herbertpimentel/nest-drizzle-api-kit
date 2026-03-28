import { eq, getTableColumns } from 'drizzle-orm';
import type { GeneratedResourceRuntimeContext } from '../common/generated-resource.types';

type TableColumnsInput = Parameters<typeof getTableColumns>[0];

export class GeneratedFindOneHandler<TResponseDto = unknown> {
  constructor(private readonly context: GeneratedResourceRuntimeContext) {}

  async execute(id: string): Promise<TResponseDto> {
    const columns = getTableColumns(this.context.table as TableColumnsInput);
    const primaryKeyColumn = columns[this.context.primaryKeyField] as any;
    const rows = await (this.context.db as any)
      .select()
      .from(this.context.table)
      .where((eq as any)(primaryKeyColumn, id))
      .limit(1);
    return rows[0] as TResponseDto;
  }
}
