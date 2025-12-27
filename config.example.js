// Copy this file to config.js and set your own values
// config.js is gitignored and will not be committed
// To generate a password hash, run: echo -n "YourPassword" | shasum -a 256
const APP_CONFIG = {
    // SHA-256 hash of your password (generate using command above)
    PASSWORD_HASH: 'your-sha256-hash-here',
    SESSION_HOURS: 2,
    DEV_MODE: false  // Set to true during development to always show password gate
};

