import { eq, getTableColumns } from 'drizzle-orm';
import type { GeneratedResourceRuntimeContext } from '../common/generated-resource.types';

type TableColumnsInput = Parameters<typeof getTableColumns>[0];

export class GeneratedDeleteHandler {
  constructor(private readonly context: GeneratedResourceRuntimeContext) {}

  async execute(id: string): Promise<void> {
    const columns = getTableColumns(this.context.table as TableColumnsInput);
    const primaryKeyColumn = columns[this.context.primaryKeyField] as any;
    await (this.context.db as any).delete(this.context.table).where((eq as any)(primaryKeyColumn, id));
  }
}
