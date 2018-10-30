/* 
* API Tests
*
*/

// Dependencies
const app = require("./../index");
const assert = require("assert");
const http = require("http");
const config = require("./../lib/config");

// Create a holder for the test

const api = {};

// Helpers;
const helpers = {};
// makeGetRequest
helpers.makeGetRequest = (path, callback) => {
  // Configure request details
  const requestDetails = {
    protocol: "http:",
    hostname: "localhost",
    port: config.httpPort,
    method: "GET",
    path: path,
    headers: { "Content-Type": "application/json" }
  };

  // Send request
  const req = http.request(requestDetails, res => {
    callback(res);
  });
  req.end();
};

// The main init() should be able to run without throwing.
api["app.init() should start without throwing"] = done => {
  assert.doesNotThrow(() => {
    app.init(() => {
      done();
    });
  }, TypeError);
};

// Make a request to ping
api["/ping should respond to GET with 200"] = done => {
  helpers.makeGetRequest("/ping", res => {
    assert.equal(res.statusCode, 200);
    done();
  });
};
// Make a request to api/users
api["/api/users should respond to GET with 400"] = done => {
  helpers.makeGetRequest("/api/users", res => {
    assert.equal(res.statusCode, 400);
    done();
  });
};
// Make a request to a random path
api["A random path should respond to GET with 404"] = done => {
  helpers.makeGetRequest("/this/path/shouldnt/exist", res => {
    assert.equal(res.statusCode, 404);
    done();
  });
};
// Make a request with a query string
api[
  "A request to users with a valid check should respond to GET with 403 as there is no token."
] = done => {
  helpers.makeGetRequest("/api/checks?id=gy9za4670oaffz7vmuer", res => {
    assert.equal(res.statusCode, 403);
    done();
  });
};

module.exports = api;
