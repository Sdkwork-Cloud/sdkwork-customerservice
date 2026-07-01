import type { PageInfo } from './page-info';
import type { TicketAttachment } from './ticket-attachment';

export interface CustomerserviceTicketsAttachmentsListPageData {
  items: TicketAttachment[];
  pageInfo: PageInfo;
}
