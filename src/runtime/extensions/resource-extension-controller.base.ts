export abstract class ResourceExtensionControllerBase<TService = unknown> {
  protected constructor(protected readonly service: TService) {}
}
