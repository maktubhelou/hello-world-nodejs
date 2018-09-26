const path = require("path");
const fs = require("fs");
const _data = require("./data");
const https = require("https");
const http = require("http");
const helpers = require("./helpers");
const url = require("url");
const _logs = require("./logs");

const workers = {};

workers.gatherAllChecks = () => {
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check => {
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error reading one of the check's data.");
          }
        });
      });
    } else {
      console.log("Error: could not find any checks to process");
    }
  });
};

workers.validateCheckData = originalCheckData => {
  originalCheckData =
    typeof originalCheckData === "object" && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id === "string" &&
    originalCheckData.id.trim().length === 20
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone === "string" &&
    originalCheckData.userPhone.trim().length === 10
      ? originalCheckData.userPhone.trim()
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol === "string" &&
    ["http", "https"].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url === "string" &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;
  originalCheckData.method =
    typeof originalCheckData.method === "string" &&
    ["post", "get", "put", "delete"].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes === "object" &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds === "number" &&
    originalCheckData.timeoutSeconds % 1 === 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // Set the keys that may not be set if the workers have not seen this check before.
  originalCheckData.state =
    typeof originalCheckData.state === "string" &&
    ["up", "down"].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : "down";
  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked === "number" &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // If all the checks pass, pass the data on to the next state in the process.
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    console.log("Error: one of the checks is not properly formatted.");
  }
};

workers.performCheck = originalCheckData => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data.
  const parsedUrl = url.parse(
    originalCheckData.protocol + "://" + originalCheckData.url,
    true
  );
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  const requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };
  // Instantiate the request object using either the http/https module
  const _moduleToUse = originalCheckData.protocol === "http" ? http : https;
  const req = _moduleToUse.request(requestDetails, res => {
    const status = res.statusCode;
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // Bind to the error event
  req.on("error", e => {
    checkOutcome.error = {
      error: true,
      value: e
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // Bind to the timeout event
  req.on("timeout", e => {
    checkOutcome.error = {
      error: true,
      value: "timeout"
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  req.end();
};

// Process the check outcome and update the check data as needed
// Special logic for accommodating a check that has never been tested before
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down in current state.
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? "up"
      : "down";

  // Decide if an alert is waranted.
  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  const timeOfCheck = Date.now();

  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  );

  // Update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates to disk
  _data.update("checks", newCheckData.id, newCheckData, err => {
    if (!err) {
      // Send the new check data to the next phase in the process
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Status: Check outcome has not changed; no alert needed.");
      }
    } else {
      console.log("Error trying to save updates to one of the checks");
    }
  });
};

// Alert the user as to a change in their status
workers.alertUserToStatusChange = newCheckData => {
  const msg = `Alert: your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}.`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, err => {
    if (!err) {
      console.log(
        "Success. User was alerted to a status change in their check via SMS.",
        msg
      );
    } else {
      console.log("Error: could not send SMS alert who had a state change.");
    }
  });
};

workers.log = (
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) => {
  // Form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state: state,
    alert: alertWarranted,
    time: timeOfCheck
  };

  const logString = JSON.stringify(logData);

  // Determine the name of the logfile;
  const logFileName = originalCheckData.id;

  // Append the logString to the file we want to write to
  _logs.append(logFileName, logString, err => {
    if (!err) {
      console.log("Logging to file succeeded.");
    } else {
      console.log("Logging to file failed.", err);
    }
  });
};

workers.rotateLogs = () => {
  // List all non-compressed log-files sitting in '.logs' folder
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach(logName => {
        // Compress the data to a different file
        const logId = logName.replace(".log", "");
        const newFileId = logId + "-" + Date.now();
        _logs.compress(logId, newFileId, err => {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, err => {
              if (!err) {
                console.log("Success truncating logfile");
              } else {
                console.log("Error truncating logfile.");
              }
            });
          } else {
            console.log("Error compressing one of the log files.", err);
          }
        });
      });
    } else {
      console.log("Error: could not find any logs to rotate.");
    }
  });
};

workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Timer to execute log rotation process 1x per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

workers.init = () => {
  workers.gatherAllChecks();
  workers.loop();
  workers.rotateLogs();
  workers.logRotationLoop();
};

module.exports = workers;
