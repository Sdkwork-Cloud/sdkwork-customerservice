export interface AutoReplyRuleSummary {
  id?: string;
  tenantId?: string;
  accountId?: string;
  pluginCode?: string;
  ruleKind?: string;
  priority?: number;
  enabled?: boolean;
  matchPattern?: string;
  replyContent?: string;
  createdAt?: string;
  updatedAt?: string;
}
