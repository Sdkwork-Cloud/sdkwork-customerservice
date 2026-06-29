export interface UpdateAutoReplyRuleRequest {
  priority?: number;
  enabled?: boolean;
  matchPattern?: string;
  replyContent?: string;
}
