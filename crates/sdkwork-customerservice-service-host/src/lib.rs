use std::sync::Arc;

use sdkwork_communication_customerservice_plugin_host::{
    ChannelDeliveryRuleEvaluationPorts, ChannelPluginHost,
};
use sdkwork_communication_customerservice_plugin_runtime::{
    default_delivery_rule_registries, PluginRuntimeManager,
};
use sdkwork_communication_customerservice_plugin_spi::{
    DeliveryRuleEvaluationPorts, PluginHostPorts,
};
use sdkwork_communication_customerservice_repository_sqlx::SqlxCustomerServiceRepository;
use sdkwork_communication_customerservice_service::CustomerServiceService;
use sdkwork_customerservice_database_host::{
    bootstrap_customerservice_database_from_env, CustomerServiceDatabaseHost,
};
use sdkwork_database_sqlx::DatabasePool;

pub struct CustomerServiceHost {
    database: CustomerServiceDatabaseHost,
    service: Arc<CustomerServiceService<SqlxCustomerServiceRepository>>,
    plugin_ports: Arc<dyn PluginHostPorts>,
    plugin_runtime: Arc<PluginRuntimeManager<SqlxCustomerServiceRepository>>,
}

impl CustomerServiceHost {
    pub async fn new() -> Self {
        Self::from_env()
            .await
            .expect("customerservice host bootstrap failed")
    }

    pub async fn from_env() -> Result<Self, String> {
        let database = bootstrap_customerservice_database_from_env().await?;
        let pool = database.pool().clone();
        let repository = SqlxCustomerServiceRepository::new(pool.clone());
        let service = Arc::new(CustomerServiceService::new(repository));
        let plugin_repository = SqlxCustomerServiceRepository::new(pool.clone());
        let runtime_repository = Arc::new(SqlxCustomerServiceRepository::new(pool));
        let eval_ports: Arc<dyn DeliveryRuleEvaluationPorts> = Arc::new(
            ChannelDeliveryRuleEvaluationPorts::new(Arc::clone(&runtime_repository)),
        );
        let delivery_registries = default_delivery_rule_registries(Arc::clone(&eval_ports));
        let plugin_ports: Arc<dyn PluginHostPorts> = Arc::new(ChannelPluginHost::new(
            plugin_repository,
            Arc::clone(&service),
            delivery_registries,
        ));
        let plugin_runtime = Arc::new(PluginRuntimeManager::new(
            Arc::clone(&plugin_ports),
            runtime_repository,
        ));
        Ok(Self {
            database,
            service,
            plugin_ports,
            plugin_runtime,
        })
    }

    pub fn service(&self) -> &CustomerServiceService<SqlxCustomerServiceRepository> {
        &self.service
    }

    pub fn service_arc(&self) -> Arc<CustomerServiceService<SqlxCustomerServiceRepository>> {
        Arc::clone(&self.service)
    }

    pub fn plugin_ports(&self) -> Arc<dyn PluginHostPorts> {
        Arc::clone(&self.plugin_ports)
    }

    pub fn plugin_runtime(&self) -> Arc<PluginRuntimeManager<SqlxCustomerServiceRepository>> {
        Arc::clone(&self.plugin_runtime)
    }

    pub fn database_pool(&self) -> &DatabasePool {
        self.database.pool()
    }
}
