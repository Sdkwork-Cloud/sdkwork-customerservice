export interface CreateAutoReplyRuleRequest {
  pluginCode: string;
  accountId?: string;
  ruleKind: string;
  priority?: number;
  enabled?: boolean;
  matchPattern?: string;
  replyContent: string;
}
