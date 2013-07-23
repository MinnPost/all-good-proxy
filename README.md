# All Good (Proxy)

A simple proxy that caches only (HTTP status) good results.  This means that the cache is only invalidated if a valid proxied request returns a positive (200-ish) status, otherwise, it will continue to serve up the cache.
