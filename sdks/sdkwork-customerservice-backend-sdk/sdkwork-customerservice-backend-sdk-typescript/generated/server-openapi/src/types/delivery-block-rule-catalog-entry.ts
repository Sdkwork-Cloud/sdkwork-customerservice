export interface DeliveryBlockRuleCatalogEntry {
  ruleCode: string;
  ruleName: string;
  ruleDescription: string;
  defaultPriority: number;
  defaultActionConfig: Record<string, unknown>;
}
