const server = require("./lib/server");
const workers = require("./lib/workers");
const cli = require("./lib/cli");

const app = {};

// Declare a global that strict mode should catch;
foo = "bar";

app.init = () => {
  server.init();
  workers.init();
  setTimeout(() => {
    cli.init();
  }, 50);
};

app.init();

module.exports = app;
