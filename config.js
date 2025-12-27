// Password is stored as SHA-256 hash - safe to commit (can't be reversed)
// To generate a new hash: open browser console and run newHash("YourPassword")
const APP_CONFIG = {
    // SHA-256 hash of password (not the actual password!)
    PASSWORD_HASH: '5ab040ed68ef953b5646bed31b95a4f372f430df11a39f5bd71700d7136d0e29',
    SESSION_HOURS: 2,
    DEV_MODE: false  // Set to true during development to always show password gate
};

