/// Auto-reply composition hints for host policy engine (reference: `auto_reply_service.py`).
pub struct GoofishAutoReplyHints;

impl GoofishAutoReplyHints {
    pub fn supports_keyword(&self) -> bool {
        true
    }

    pub fn supports_ai(&self) -> bool {
        true
    }

    pub fn supports_default(&self) -> bool {
        true
    }
}
