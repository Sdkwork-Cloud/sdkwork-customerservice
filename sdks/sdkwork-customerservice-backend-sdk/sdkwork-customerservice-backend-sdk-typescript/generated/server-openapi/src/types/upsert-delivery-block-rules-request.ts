import type { UpsertDeliveryBlockRuleItem } from './upsert-delivery-block-rule-item';

export interface UpsertDeliveryBlockRulesRequest {
  pluginCode: string;
  rules: UpsertDeliveryBlockRuleItem[];
}
