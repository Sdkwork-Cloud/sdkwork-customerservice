export interface AutoReplyRuleSummary {
  id: string;
  tenantId: string;
  accountId?: string;
  pluginCode: string;
  ruleKind: string;
  priority: number;
  enabled: boolean;
  matchPattern?: string | null;
  replyContent?: string | null;
  createdAt: string;
  updatedAt: string;
}
