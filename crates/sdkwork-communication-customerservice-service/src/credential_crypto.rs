use sdkwork_utils_rust::{aes_gcm_decrypt, aes_gcm_encrypt, derive_aes_256_key};

use crate::CustomerServiceError;

/// Active envelope for L3 channel credential storage (`database/contract/schema.yaml`).
pub const CREDENTIAL_KEY_VERSION_AES256GCM: &str = "aes256gcm-v1";

const MASTER_KEY_ENV: &str = "CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY";
const HKDF_SALT: &[u8] = b"sdkwork.customerservice.credential";
const HKDF_INFO: &[u8] = b"communication_cs_channel_account_credential";

fn credential_master_key() -> Result<Vec<u8>, CustomerServiceError> {
    let raw = std::env::var(MASTER_KEY_ENV).map_err(|_| {
        CustomerServiceError::Persistence(format!(
            "{MASTER_KEY_ENV} must be configured for channel credential encryption"
        ))
    })?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(CustomerServiceError::Persistence(format!(
            "{MASTER_KEY_ENV} must not be empty"
        )));
    }
    Ok(trimmed.as_bytes().to_vec())
}

fn derived_cipher_key() -> Result<[u8; 32], CustomerServiceError> {
    let master = credential_master_key()?;
    Ok(derive_aes_256_key(&master, HKDF_SALT, HKDF_INFO))
}

/// Encrypts credential plaintext for persistence (`encrypted_payload` column).
pub fn encrypt_credential_payload(plaintext: &[u8]) -> Result<Vec<u8>, CustomerServiceError> {
    let key = derived_cipher_key()?;
    let encoded = aes_gcm_encrypt(&key, plaintext).map_err(|error| {
        CustomerServiceError::Persistence(format!("credential encryption failed: {error}"))
    })?;
    Ok(encoded.into_bytes())
}

/// Decrypts a stored credential payload for runtime use.
pub fn decrypt_credential_payload(
    payload: &[u8],
    key_version: &str,
) -> Result<String, CustomerServiceError> {
    match key_version {
        CREDENTIAL_KEY_VERSION_AES256GCM => {
            let key = derived_cipher_key()?;
            let encoded = std::str::from_utf8(payload).map_err(|error| {
                CustomerServiceError::Persistence(format!(
                    "credential payload is not valid UTF-8 envelope: {error}"
                ))
            })?;
            let plaintext = aes_gcm_decrypt(&key, encoded).map_err(|error| {
                CustomerServiceError::Persistence(format!("credential decryption failed: {error}"))
            })?;
            String::from_utf8(plaintext).map_err(|error| {
                CustomerServiceError::Persistence(format!(
                    "credential plaintext is not valid UTF-8: {error}"
                ))
            })
        }
        other => Err(CustomerServiceError::Persistence(format!(
            "unsupported credential key_version: {other}"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_round_trip() {
        std::env::set_var(MASTER_KEY_ENV, "test-master-key-for-unit-tests");
        let plaintext = b"goofish-cookie=value";
        let stored = encrypt_credential_payload(plaintext).expect("encrypt");
        let decoded =
            decrypt_credential_payload(&stored, CREDENTIAL_KEY_VERSION_AES256GCM).expect("decrypt");
        assert_eq!(decoded, "goofish-cookie=value");
    }
}
