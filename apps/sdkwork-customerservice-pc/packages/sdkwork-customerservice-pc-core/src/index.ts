export { resolveCustomerServiceApiBaseUrl, resolveDriveApiBaseUrl } from "./config/resolveApiBaseUrl";
export {
  buildOperatorSdkHeaders,
  getOperatorTokenManager,
  loadOperatorSession,
  readOperatorSessionFromEnv,
  saveOperatorSession,
  OPERATOR_SESSION_STORAGE_KEY,
  OPERATOR_SESSION_CHANGED_EVENT,
  type OperatorSession,
} from "./session/operatorSession";
export {
  clearCustomerServiceIamSession,
  commitCustomerServiceIamSession,
  loadCustomerServiceIamSession,
  toOperatorSession,
  CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY,
  type CustomerServiceIamSession,
} from "./session/iamOperatorSessionBridge";
export {
  getCustomerServiceIamRuntime,
  resetCustomerServiceIamRuntime,
  resolveCustomerServiceAuthRuntimeConfig,
  resolveCustomerServicePcAuthAppearance,
} from "./sdk/appAuthRuntime";
export { createCustomerServiceBackendClient } from "./sdk/createBackendSdkClient";
export { createCustomerServiceAppSdkClients } from "./sdk/createAppSdkClients";
export {
  listOperatorTickets,
  retrieveOperatorTicket,
  updateOperatorTicket,
  listOperatorTicketMessages,
  sendOperatorTicketMessage,
  registerTicketAttachmentMetadata,
  type TicketAdminListParams,
} from "./services/ticketAdminService";
export {
  listChannelAccounts,
  createChannelAccount,
  registerChannelCredential,
  listAutoReplyRules,
  createAutoReplyRule,
  startChannelAccountRuntime,
  stopChannelAccountRuntime,
  getChannelAccountRuntimeStatus,
} from "./services/channelAdminService";
export {
  listPluginCatalog,
  upsertPluginEnablement,
} from "@sdkwork/customerservice-client-core";
export {
  createDriveAttachmentUploadPort,
  type DriveAttachmentUploadPort,
  type DriveAttachmentUploadResult,
} from "./services/driveAttachmentUploadPort";
