// The real "server-only" package throws when it is loaded outside a server
// bundle, which is its job. Unit tests run outside any bundle, so they load
// this empty stand-in instead (see vitest.config.mts).
export {};
