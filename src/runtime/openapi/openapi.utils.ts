export function defaultOpenApiSummary(
  endpoint: 'find' | 'findOne' | 'create' | 'update' | 'delete',
  singularName: string,
  pluralName: string,
): string {
  switch (endpoint) {
    case 'find':
      return `Find ${pluralName}`;
    case 'findOne':
      return `Find ${singularName}`;
    case 'create':
      return `Create ${singularName}`;
    case 'update':
      return `Update ${singularName}`;
    case 'delete':
      return `Delete ${singularName}`;
  }
}
