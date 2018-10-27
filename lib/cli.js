// CLI related tasks

const readline = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");
const os = require("os");
const v8 = require("v8");
class _events extends events {}
const e = new _events();
const _data = require("./data");
const _logs = require("./logs");
const helpers = require("./helpers");

const cli = {};

// Init Script
cli.init = () => {
  // Send the start message to the console in dark blue
  console.log("\x1b[34m%s\x1b[0m", `The CLI is running.`);

  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "😀 Welcome! >"
  });

  _interface.prompt();

  _interface.on("line", str => {
    // Send to input processor
    cli.processInput(str);

    // Re-initialize the prompt.
    _interface.prompt();
  });

  // If user stops CLI, kill the associated process.
  _interface.on("close", () => {
    process.exit(0);
  });
};

// Input handlers
e.on("man", str => {
  cli.responders.help();
});
e.on("help", str => {
  cli.responders.help();
});
e.on("exit", str => {
  cli.responders.exit();
});
e.on("stats", str => {
  cli.responders.stats();
});
e.on("list users", str => {
  cli.responders.listUsers();
});
e.on("more user info", str => {
  cli.responders.moreUserInfo(str);
});
e.on("list checks", str => {
  cli.responders.listChecks(str);
});
e.on("more check info", str => {
  cli.responders.moreCheckInfo(str);
});
e.on("list logs", str => {
  cli.responders.listLogs();
});
e.on("more log info", str => {
  cli.responders.moreLogInfo(str);
});

// Input responders
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  const uniqueInputs = {
    exit: "Kill the CLI and the rest of the application.",
    man: "Show this help page.",
    help: "Show this help page.",
    stats:
      "Get statistics on the underlying operating system and ressource utilization.",
    "list users":
      "Show a list of all the registered (undeleted) users in the system.",
    "more user info --{userId}": "Show details of a specific user.",
    "list checks --up --down":
      'Show a list of all active checks in the system including their state. The "--up" and "--down" flags are both optional.',
    "more check info --{checkId}": "Show details of a specify check.",
    "list logs":
      "Show a list of all files available to be read (compressed only).",
    "more log info --{fileName}": "Show details of a specified log file."
  };

  // Show a header for the help page that is as wide as the screen.
  cli.horizontalLine();
  cli.centered("CLI MANUAL");
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command followed by its explanation in white and yellow respectively.
  for (let key in uniqueInputs) {
    if (uniqueInputs.hasOwnProperty(key)) {
      const value = uniqueInputs[key];
      let line = "\x1b[33m" + key + "\x1b[0m";
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += " ";
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();

  // End with another horizontal line;
  cli.horizontalLine();
};

cli.verticalSpace = lines => {
  lines = typeof lines === "number" && lines > 0 ? lines : 1;
  for (i = 0; i < lines; i++) {
    console.log("");
  }
};

cli.horizontalLine = () => {
  // get the available screen size;
  const width = process.stdout.columns;
  let line = "";
  for (i = 0; i < width; i++) {
    line += "-";
  }
  console.log(line);
};

// Create centered text on screen;
cli.centered = str => {
  str = typeof str === "string" && str.trim().length > 0 ? str.trim() : "";
  const width = process.stdout.columns;
  const leftPadding = Math.floor((width - str.length) / 2);
  let line = "";
  for (i = 0; i < leftPadding; i++) {
    line += " ";
  }
  line += str;
  console.log(line);
};

// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Stats
cli.responders.stats = () => {
  const stats = {
    "Load Average": os.loadavg().join(" "),
    "CPU Count": os.cpus.length,
    "Free Memory": os.freemem(),
    "Current Malloced Memory": v8.getHeapStatistics().malloced_memory,
    "Peak Malloced Memory": v8.getHeapStatistics().peak_malloced_memory,
    "Allocated Heap Used (%)": Math.round(
      (v8.getHeapStatistics().used_heap_size /
        v8.getHeapStatistics().total_heap_size) *
        100
    ),
    "Available Heap Allocated (%)": Math.round(
      (v8.getHeapStatistics().total_heap_size /
        v8.getHeapStatistics().heap_size_limit) *
        100
    ),
    Uptime: os.uptime() + " Seconds"
  };

  // Show a header for the Stats Page;
  cli.horizontalLine();
  cli.centered("SYSTEM STATISTICS");
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each stat
  for (let key in stats) {
    if (stats.hasOwnProperty(key)) {
      const value = stats[key];
      let line = "\x1b[33m" + key + "\x1b[0m";
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += " ";
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();

  // End with another horizontal line;
  cli.horizontalLine();
};

// List Users
cli.responders.listUsers = () => {
  _data.list("users", (err, userIds) => {
    if (!err && userIds && userIds.length > 0) {
      cli.verticalSpace();
      userIds.forEach(userId => {
        _data.read("users", userId, (err, userData) => {
          if (!err && userData) {
            let line =
              "Name: " +
              userData.firstName +
              " " +
              userData.lastName +
              " Phone: " +
              userData.phone +
              " Checks: ";
            let numberOfChecks =
              typeof userData.checks === "object" &&
              userData.checks instanceof Array &&
              userData.checks.length > 0
                ? userData.checks.length
                : 0;
            line += numberOfChecks;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// More user info
cli.responders.moreUserInfo = str => {
  // Get the userId from the string.
  const arr = str.split("--");
  const userId =
    typeof arr[1] === "string" && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (userId) {
    _data.read("users", userId, (err, userData) => {
      if (!err && userData) {
        delete userData.hashedPassword;
        cli.verticalSpace();
        console.dir(userData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// List checks
cli.responders.listChecks = str => {
  _data.list("checks", (err, checkIds) => {
    if (!err && checkIds && checkIds.length > 0) {
      cli.verticalSpace();
      checkIds.forEach(checkId => {
        _data.read("checks", checkId, (err, checkData) => {
          let includeCheck = false;
          const lowerString = str.toLowerCase();

          // Get the State, default to Down.
          let state =
            typeof checkData.state === "string" ? checkData.state : "down";
          let stateOrUknown =
            typeof checkData.state === "string" ? checkData.state : "unknown";

          // If the user has specified the state or hasn't specified any state;
          if (
            lowerString.indexOf("--" + state) > -1 ||
            (lowerString.indexOf("--down") === -1 &&
              lowerString.indexOf("--up") === -1)
          ) {
            let line =
              "ID: " +
              checkData.id +
              " " +
              checkData.method.toUpperCase() +
              " " +
              checkData.protocol +
              "://" +
              checkData.url +
              " State: " +
              stateOrUknown;

            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// more check info
cli.responders.moreCheckInfo = str => {
  // Get the checkId from the string.
  const arr = str.split("--");
  const checkId =
    typeof arr[1] === "string" && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (checkId) {
    _data.read("checks", checkId, (err, checkData) => {
      if (!err && checkData) {
        cli.verticalSpace();
        console.dir(checkData, { colors: true });
        cli.verticalSpace();
      }
    });
  }
};

// more check info
cli.responders.listLogs = () => {
  _logs.list(true, (err, logFileNames) => {
    if (!err && logFileNames && logFileNames.length > 0) {
      cli.verticalSpace();
      logFileNames.forEach(logFileName => {
        if (logFileName.indexOf("-") > -1) {
          console.log(logFileName);
          cli.verticalSpace();
        }
      });
    }
  });
};

// more user info
cli.responders.moreLogInfo = str => {
  // Get the logFileName from the string.
  const arr = str.split("--");
  const logFileName =
    typeof arr[1] === "string" && arr[1].trim().length > 0
      ? arr[1].trim()
      : false;
  if (logFileName) {
    cli.verticalSpace();
    // Decompress the logfile
    _logs.decompress(logFileName, (err, stringData) => {
      if (!err && stringData) {
        // Split into lines
        const arr = stringData.split("\n");
        arr.forEach(jsonString => {
          let logObject = helpers.parseJsonToObject(jsonString);
          if (logObject && JSON.stringify(logObject) !== "{}") {
            console.dir(logObject, { colors: true });
            cli.verticalSpace();
          }
        });
      }
    });
  }
};

// Input Processor
cli.processInput = str => {
  str = typeof str === "string" && str.trim().length > 0 ? str.trim() : false;

  // Only process if the user actual wrote something
  if (str) {
    // Codify the unique strings
    const uniqueInputs = [
      "man",
      "help",
      "exit",
      "stats",
      "list users",
      "more user info",
      "list checks",
      "more check info",
      "list logs",
      "more log info"
    ];

    let matchFound = false;
    let counter = 0;
    uniqueInputs.some(input => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        e.emit(input, str);
        return true;
      }
    });

    // If no match is found tell user to try again
    if (!matchFound) {
      console.log("Sorry, try again!");
    }
  }
};

module.exports = cli;
