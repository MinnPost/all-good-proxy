// Libs
var http = require('http');
var url = require('url');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var request = require('request');

// "Global" vars
var port = process.env.PORT || 5000;
var domainRegex = process.env.AG_PROXY_DOMAIN_REGEX || '';
var cacheMinutes = process.env.AG_PROXY_CACHE_TIME || 5;
var cacheLocation = process.env.AG_PROXY_CACHE_LOCATION || 'cache';
var defaultResponse = 'This is a basic proxy server, see code at https://github.com/MinnPost/all-good-proxy';
var currentDir = __dirname;

// Process environment variables
port = (_.isNumber(port)) ? port : 5000;
domainRegex = (_.isString(domainRegex)) ? new RegExp(domainRegex) : new RegExp('');
cacheMinutes = (_.isNumber(cacheMinutes)) ? cacheMinutes : 60;
cacheLocation = (_.isString(cacheLocation)) ? cacheLocation : 'cache';

// Handle a request
function makeRequest(options, done, error) {
  var req = request(options, function(reqError, res, data) {
    if (reqError) {
      error(reqError);
    }
    else {
      if (_.isNumber(res.statusCode) && res.statusCode >= 200 &&
        res.statusCode < 300) {
        done(res, data);
      }
      else {
        error(res, data);
      }
    }
  });
}

// Check if whitelisted
function checkDomain(url) {
  return url.match(domainRegex);
}

// Save cache
function cacheSave(id, data, done) {
  var hash = crypto.createHash('md5').update(id).digest('hex');
  var store = path.join(currentDir, cacheLocation, hash);
  
  data.time = new Date().getTime();
  data = JSON.stringify(data);
  
  fs.writeFile(store, data, function(err) {
    if (err) {
      console.log(err);
    }
    if (_.isFunction(done)) {
      done(err);
    }
  });
}

// Save cache
function cacheLoad(id, done) {
  var hash = crypto.createHash('md5').update(id).digest('hex');
  var store = path.join(currentDir, cacheLocation, hash);
  
  fs.exists(store, function(exists) {
    if (exists) {
      fs.readFile(store, function(err, data) {
        data = JSON.parse(data);
        done(err, data);
      });
    }
    else {
      done('No cache');
    }
  });
}

// Cache and display
function cacheAndDisplay(res, id, code, headers, data) {
  cacheSave(id, {
    code: code,
    header: headers,
    data: data
  });
  res.writeHead(code, headers);
  res.end(data);
}

// Main proxy logic
function proxy(req, res, proxyURL) {
  var proxyReq = url.parse(proxyURL);
  var proxyOptions = {};
  var cache = false;
  var now = new Date().getTime();
  var cacheDiff;
  
  // Check if url fits domain
  if (!checkDomain(proxyReq.host || proxyURL)) {
    res.statusCode = 404;
    res.end(defaultResponse);
  }

  // Make request options
  proxyOptions = {
    uri: proxyURL,
    host: proxyReq.host,
    hostname: proxyReq.hostname,
    port: proxyReq.port || 80,
    method: req.method,
    path: proxyReq.path,
    //headers: req.headers,
  };
  //delete proxyOptions.headers.cookie;
  //delete proxyOptions.headers.host;
  
  // Get cache
  cacheLoad(proxyURL, function(err, cacheData) {
    if (err) {
      console.log(err);
    }
    else if (cacheData) {
      cache = true;
    }

    // Check cache
    if (cache) {
      // If cache, check time (in minutes)
      cacheDiff = (now - cacheData.time) / 60 / 1000;
      
      // If not past time, serve up cache
      if (cacheDiff < cacheMinutes) {
        res.writeHead(cacheData.code, cacheData.headers);
        res.end(cacheData.data);
      }
      else {
        // If past time, try to make a new request, otherwise, use
        // old cache and update time.  Force a small-ish timeout.
        proxyOptions.timeout = 5000;
        makeRequest(proxyOptions, function(proxyRes, data) {
          delete proxyRes.headers['content-disposition'];
          cacheAndDisplay(res, proxyURL, proxyRes.statusCode, proxyRes.headers, data);
        },
        function(proxyRes, data) {
          cacheAndDisplay(res, proxyURL, cacheData.code, cacheData.headers, cacheData.data);
        });
      }
    }
    else {
      makeRequest(proxyOptions, function(proxyRes, data) {
        delete proxyRes.headers['content-disposition'];
        cacheAndDisplay(res, proxyURL, proxyRes.statusCode, proxyRes.headers, data);
      }, 
      function(proxyRes, data) {
        // No cache and error, so just return what was
        if (data) {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          res.end(data);
        }
        else {
          res.statusCode = 500;
          res.end(defaultResponse);
        }
      });
    }
  });
}

// Main server
function server(req, res) {
  var queryParams = url.parse(req.url, true).query;
  var proxyURL = (_.isObject(queryParams)) ? queryParams.url : false;

  // if incoming url req
  if (proxyURL) {
    proxy(req, res, proxyURL)
  }
  else {
    res.end(defaultResponse);
  }
}

// Start server
http.createServer(server).listen(port);
console.log('Operating on port: ' + port);