import {
  createDriveAttachmentUploadPort as createSharedDriveAttachmentUploadPort,
  type DriveAttachmentUploadPort,
  type DriveAttachmentUploadResult,
} from "@sdkwork/customerservice-client-core";
import type { SdkworkDriveAppClient } from "@sdkwork/drive-app-sdk";

export type { DriveAttachmentUploadPort, DriveAttachmentUploadResult };

export function createDriveAttachmentUploadPort(
  driveClient: SdkworkDriveAppClient,
): DriveAttachmentUploadPort {
  return createSharedDriveAttachmentUploadPort(driveClient, { source: "customerservice_pc" });
}
