const config = require("./lib/config");
const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");
const StringDecoder = require("string_decoder").StringDecoder;

// Instantiate HTTP Server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

httpServer.listen(config.httpPort, () => {
  console.log(`The server is listening on port: ${config.httpPort}.`);
});

// Instantiate HTTPS Server
const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem")
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is listening on port: ${config.httpsPort}.`);
});

// Unified Server
const unifiedServer = (req, res) => {
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
    const chosenHandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;
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
    chosenHandler(data, (statusCode, payload) => {
      // Use statusCode called back by handler or default to 200
      statusCode = typeof statusCode === "number" ? statusCode : 200;

      // Use the payload called back by the handler or default to an empty object
      payload = typeof payload === "object" ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader("content-type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request
      console.log(`Returning this response:`, statusCode, payloadString);
    });
  });
};

// Define a request router
const router = {
  ping: handlers.ping,
  hello: handlers.hello,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};
