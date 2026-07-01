import type { PageInfo } from './page-info';
import type { TicketSummary } from './ticket-summary';

export interface CustomerserviceTicketsListPageData {
  items: TicketSummary[];
  pageInfo: PageInfo;
}
