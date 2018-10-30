const server = require("./lib/server");
const workers = require("./lib/workers");
const cli = require("./lib/cli");
const exampleDebuggingProblem = require("./lib/exampleDebuggingProblem");

const app = {};

app.init = () => {
  debugger;
  server.init();
  debugger;

  debugger;
  workers.init();
  debugger;

  debugger;
  setTimeout(() => {
    cli.init();
    debugger;
  }, 50);
  debugger;

  // Set foo at 1
  debugger;
  let foo = 1;
  console.log("Just assigned 1 to foo.");
  debugger;

  foo++;
  console.log("Just incremented foo.");
  debugger;

  foo = foo * foo;
  console.log("Just multiplied foo.");
  debugger;

  foo = foo.toString();
  console.log("Just converted foo to string.");
  debugger;

  //Call the Init script that will throw.
  debugger;
  exampleDebuggingProblem.init();
  console.log("Just called the library.");
  debugger;
};

app.init();

module.exports = app;
