const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const path = require("path");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const handlers = require("./handlers");
const helpers = require("./helpers");
const util = require("util");
const debug = util.debuglog("server");

// // @TODO delete
// helpers.sendTwilioSms("7094277675", "Hello", err => {
//   debug("this was the error", err);
// });

// Instantiate the server model object
const server = {};

// Instantiate HTTP Server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate HTTPS Server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem"))
};

server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

// Unified Server
server.unifiedServer = (req, res) => {
  // Get the parsed URL
  const parsedUrl = url.parse(req.url, true);

  // Get the pathname
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", data => (buffer += decoder.write(data)));
  req.on("end", () => {
    buffer += decoder.end();
    // Choose the handler... if one is not found use notFound handler
    let chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    // If the request is within the public directory, use the chosen hanlder instead
    chosenHandler =
      trimmedPath.indexOf("public/") > -1 ? handlers.public : chosenHandler;

    // Construct data object to send to handler
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer),
      buffer: buffer
    };
    // route request to handler specified in the router
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Determine the type of response callback to JSON
      contentType = typeof contentType === "string" ? contentType : "json";
      // Use statusCode called back by handler or default to 200
      statusCode = typeof statusCode === "number" ? statusCode : 200;

      // Return the response parts that are content specific
      let payloadString = "";
      if (contentType === "json") {
        res.setHeader("content-type", "application/json");
        // Use the payload called back by the handler or default to an empty object

        payload = typeof payload === "object" ? payload : {};
        // Convert the payload to a string
        payloadString = JSON.stringify(payload);
      }
      if (contentType === "html") {
        res.setHeader("content-type", "text/html");
        payloadString = typeof payload === "string" ? payload : "";
      }
      if (contentType === "favicon") {
        res.setHeader("content-type", "image/x-icon");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "css") {
        res.setHeader("content-type", "text/css");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "png") {
        res.setHeader("content-type", "image/png");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "jpg") {
        res.setHeader("content-type", "image/jpeg");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "plain") {
        res.setHeader("content-type", "text/plain");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      // Return the response parts that are common to all types
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request
      if (statusCode === 200) {
        debug(
          "\x1b[32m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      }
    });
  });
};

// Define a request router
server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checksList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,
  ping: handlers.ping,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks,
  "favicon.ico": handlers.favicon,
  public: handlers.public
};

server.init = () => {
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "\x1b[36m%s\x1b[0m",
      `The server is listening on port: ${config.httpPort}.`
    );
  });
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "\x1b[35m%s\x1b[0m",
      `The server is listening on port: ${config.httpsPort}.`
    );
  });
};

module.exports = server;
