import type { PageInfo } from './page-info';
import type { TicketMessage } from './ticket-message';

export interface CustomerserviceTicketsAdminMessagesListPageData {
  items: TicketMessage[];
  pageInfo: PageInfo;
}
