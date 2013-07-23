# All Good (Proxy)

A simple proxy that caches only (HTTP status) good results.  This means that the cache is only invalidated if a valid proxied request returns a positive (200-ish) status, otherwise, it will continue to serve up the cache.

## Install

1. Install Node.
1. Install packages: `npm install`

## Configure and options

Uses environment variables for configuration.

* `PORT`: Port to run server on.  Default is `5000`.
* `AG_PROXY_DOMAIN_REGEX`: Regex to whitelist domain.  Default is blank, ``, which allows any domain.  It is suggested to update this for security reasons; for instance to allow the ScraperWiki and Google domains, use `scraperwiki|google`.
* `AG_PROXY_CACHE_TIME`: Time to keep cache in minutes.  Default is `20`.
* `AG_PROXY_CACHE_LOCATION`: Location of the cache files.  Default is `cache`.

To set environment variables locally, use something similar to:

`export AG_PROXY_DOMAIN_REGEX="scraperwiki|google"`

## Run

1. `node proxy.js`

## Use

At the created server, just add the query parameter `?url=`.  For instance [http://localhost:5000/?url=http://google.com](http://localhost:5000/?url=http://google.com).  Do make sure to encode the parameter so that it is read correctly by the server.

## Deploy on Heroku

1. `heroku create <app-name>`
1. Set configuration values, with something similar to: `heroku config:set AG_PROXY_DOMAIN_REGEX="scraperwiki|google"`
1. `git push heroku master`
1. Visit site with: `heroku open`


