export interface CreateTicketRequest {
  organizationId?: string;
  subject: string;
  body: string;
  priority?: string;
  channel?: string;
}
