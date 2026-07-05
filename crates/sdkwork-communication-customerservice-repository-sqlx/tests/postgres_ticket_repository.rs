use sdkwork_communication_customerservice_repository_sqlx::SqlxCustomerServiceRepository;
use sdkwork_communication_customerservice_service::CustomerServiceService;
use sdkwork_customerservice_database_host::{
    testing::postgres_integration, CustomerServiceDatabaseHost,
};

fn service(
    host: &CustomerServiceDatabaseHost,
) -> CustomerServiceService<SqlxCustomerServiceRepository> {
    let repository = SqlxCustomerServiceRepository::new(host.pool().clone());
    CustomerServiceService::new(repository)
}

async fn try_bootstrap() -> Option<CustomerServiceDatabaseHost> {
    postgres_integration::try_bootstrap_database_host().await
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_create_ticket_persists_and_lists_for_requester() {
    let Some(host) = try_bootstrap().await else {
        eprintln!("SKIP postgres integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    use sdkwork_communication_customerservice_service::CreateTicketCommand;
    let service = service(&host);
    let tenant_id = uuid::Uuid::new_v4();
    let requester_user_id = uuid::Uuid::new_v4();

    let created = service
        .create_ticket(CreateTicketCommand {
            tenant_id,
            organization_id: None,
            requester_user_id,
            subject: "postgres integration".to_owned(),
            body: "ticket body".to_owned(),
            priority: None,
            channel: None,
        })
        .await
        .expect("create ticket");

    let (items, total) = service
        .list_my_tickets(tenant_id, requester_user_id, None, 0, 20)
        .await
        .expect("list tickets");
    assert!(total >= 1);
    assert!(
        items.iter().any(|item| item.id == created.summary.id),
        "created ticket should appear in requester list"
    );
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_retrieve_ticket_isolates_requester() {
    let Some(host) = try_bootstrap().await else {
        eprintln!("SKIP postgres integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    use sdkwork_communication_customerservice_service::{
        CreateTicketCommand, CustomerServiceError,
    };
    let service = service(&host);
    let tenant_id = uuid::Uuid::new_v4();
    let owner_id = uuid::Uuid::new_v4();
    let other_id = uuid::Uuid::new_v4();

    let created = service
        .create_ticket(CreateTicketCommand {
            tenant_id,
            organization_id: None,
            requester_user_id: owner_id,
            subject: "owner ticket".to_owned(),
            body: "private".to_owned(),
            priority: None,
            channel: None,
        })
        .await
        .expect("create ticket");

    let result = service
        .retrieve_ticket_for_requester(tenant_id, other_id, created.summary.id)
        .await;
    assert!(matches!(result, Err(CustomerServiceError::NotFound(_))));
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_retrieve_ticket_isolates_tenant() {
    let Some(host) = try_bootstrap().await else {
        eprintln!("SKIP postgres integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    use sdkwork_communication_customerservice_service::{
        CreateTicketCommand, CustomerServiceError,
    };
    let service = service(&host);
    let tenant_a = uuid::Uuid::new_v4();
    let tenant_b = uuid::Uuid::new_v4();
    let requester_user_id = uuid::Uuid::new_v4();

    let created = service
        .create_ticket(CreateTicketCommand {
            tenant_id: tenant_a,
            organization_id: None,
            requester_user_id,
            subject: "tenant scoped".to_owned(),
            body: "tenant isolation".to_owned(),
            priority: None,
            channel: None,
        })
        .await
        .expect("create ticket");

    let result = service
        .retrieve_ticket_for_requester(tenant_b, requester_user_id, created.summary.id)
        .await;
    assert!(matches!(result, Err(CustomerServiceError::NotFound(_))));
}
