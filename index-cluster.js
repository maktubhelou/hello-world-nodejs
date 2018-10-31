const server = require("./lib/server");
const workers = require("./lib/workers");
const cli = require("./lib/cli");
const cluster = require("cluster");
const os = require("os");

const app = {};

app.init = callback => {
  // Start the workers and the API on the master cluster
  if (cluster.isMaster) {
    // Start the workers
    workers.init();

    // Start the CLI but make sure it starts last.
    setTimeout(() => {
      cli.init();
      callback();
    }, 50);

    // Fork the process
    for (i = 0; i < os.cpus().length; i++) {
      cluster.fork();
    }
  } else {
    // If we're not on the master thread, start the server
    server.init();
  }
};

// Self-invoking only if required directly.
if (require.main === module) {
  // this only calls app.init() if app.init() is required directly
  app.init(() => {});
}

module.exports = app;
