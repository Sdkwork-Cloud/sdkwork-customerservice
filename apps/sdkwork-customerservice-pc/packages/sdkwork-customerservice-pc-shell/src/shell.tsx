import { useCallback, useMemo, useState } from "react";
import {
  createCustomerServiceAppSdkClients,
  createCustomerServiceBackendClient,
  createDriveAttachmentUploadPort,
  getOperatorTokenManager,
  loadOperatorSession,
  registerTicketAttachmentMetadata,
  type OperatorSession,
} from "@sdkwork/customerservice-pc-core";
import { OperatorSessionPanel } from "./operator-session-panel";
import { ChannelAdminPanel } from "./channel-admin-panel";
import { TicketWorkbenchPanel } from "./ticket-workbench-panel";

function useOperatorRuntime(session: OperatorSession | null) {
  const tokenManager = useMemo(() => getOperatorTokenManager(), [session]);
  const backendClient = useMemo(
    () => createCustomerServiceBackendClient({ session, tokenManager }),
    [session, tokenManager],
  );
  const appClients = useMemo(
    () => createCustomerServiceAppSdkClients({ session, tokenManager }),
    [session, tokenManager],
  );
  const driveUploadPort = useMemo(
    () => createDriveAttachmentUploadPort(appClients.drive),
    [appClients.drive],
  );
  return { backendClient, appClients, driveUploadPort };
}

export function CustomerServiceAppShell() {
  const [session, setSession] = useState<OperatorSession | null>(() => loadOperatorSession());
  const { backendClient, appClients, driveUploadPort } = useOperatorRuntime(session);
  const [uploadTicketId, setUploadTicketId] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const onAttachmentSelected = useCallback(
    async (file: File) => {
      if (!uploadTicketId) {
        setUploadStatus("Select a ticket in the workbench before uploading.");
        return;
      }
      if (!session?.accessToken && !session?.authToken) {
        setUploadStatus("Save an operator session before uploading attachments.");
        return;
      }
      setUploadStatus(`Uploading ${file.name} through sdkwork-drive…`);
      try {
        const uploaded = await driveUploadPort.uploadTicketAttachment(file);
        await registerTicketAttachmentMetadata(appClients.customerService, uploadTicketId, uploaded);
        setUploadStatus(`Registered attachment ${uploaded.fileName} (${uploaded.driveNodeId}).`);
      } catch (cause: unknown) {
        setUploadStatus(cause instanceof Error ? cause.message : "Attachment upload failed");
      }
    },
    [appClients.customerService, driveUploadPort, session, uploadTicketId],
  );

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "1080px" }}>
      <h1>SDKWork Customer Service</h1>
      <p>Operator console: ticket workbench, channel accounts, and Drive-backed attachments.</p>
      <OperatorSessionPanel
        onSessionChange={(nextSession) => {
          setSession(nextSession);
          setReloadKey((value) => value + 1);
        }}
      />
      <TicketWorkbenchPanel
        key={reloadKey}
        session={session}
        backendClient={backendClient}
        onSelectedTicketChange={setUploadTicketId}
      />
      <ChannelAdminPanel session={session} backendClient={backendClient} />
      <section aria-labelledby="attachment-upload-heading" style={{ marginTop: "1.5rem" }}>
        <h2 id="attachment-upload-heading">Attachment upload</h2>
        <p style={{ color: "#57606a", marginTop: 0 }}>
          Selected ticket: {uploadTicketId || "none"}
        </p>
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onAttachmentSelected(file);
            }
          }}
        />
        {uploadStatus ? <p style={{ color: "#57606a" }}>{uploadStatus}</p> : null}
      </section>
    </main>
  );
}
