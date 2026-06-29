pub mod channel;
pub mod postgres;

pub use postgres::SqlxCustomerServiceRepository;

pub const TABLE_PREFIX: &str = "communication_";
