import type { PageInfo } from './page-info';
import type { TicketMessage } from './ticket-message';

export interface CustomerserviceTicketsMessagesListPageData {
  items: TicketMessage[];
  pageInfo: PageInfo;
}
