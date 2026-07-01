import type { PageInfo } from './page-info';
import type { TicketSummary } from './ticket-summary';

export interface CustomerserviceTicketsAdminListPageData {
  items: TicketSummary[];
  pageInfo: PageInfo;
}
