import { randomString } from "@sdkwork/utils";
import type { SdkworkDriveAppClient } from "@sdkwork/drive-app-sdk";

export interface DriveAttachmentUploadResult {
  driveNodeId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface DriveAttachmentUploadPort {
  uploadTicketAttachment(file: File): Promise<DriveAttachmentUploadResult>;
}

export interface CreateDriveAttachmentUploadPortOptions {
  source: "customerservice_pc" | "customerservice_h5";
}

export function createDriveAttachmentUploadPort(
  driveClient: SdkworkDriveAppClient,
  options: CreateDriveAttachmentUploadPortOptions,
): DriveAttachmentUploadPort {
  return {
    async uploadTicketAttachment(file: File): Promise<DriveAttachmentUploadResult> {
      const contentType = file.type || "application/octet-stream";
      const uploadResult = await driveClient.uploader.upload({
        file,
        taskId: randomString(16),
        appResourceType: "customerservice-ticket-attachment",
        appResourceId: "ticket-attachment",
        scene: "customerservice_ticket_attachment",
        source: options.source,
        uploadProfileCode: "attachment",
        fileFingerprint: `${file.name}:${file.size}:${contentType}`,
        originalFileName: file.name,
        contentType,
      });

      return {
        driveNodeId: uploadResult.uploadItem.nodeId,
        fileName: uploadResult.uploadItem.originalFileName,
        contentType: uploadResult.uploadItem.contentType,
        sizeBytes: Number(uploadResult.uploadItem.contentLength) || file.size,
      };
    },
  };
}
