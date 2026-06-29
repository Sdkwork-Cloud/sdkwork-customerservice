export interface UpsertDeliveryBlockRuleItem {
  ruleCode: string;
  enabled: boolean;
  priority: number;
  excludedExternalItemIds?: string[];
  actionConfig?: Record<string, unknown>;
}
