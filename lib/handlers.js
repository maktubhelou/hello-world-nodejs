// Dependencies
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

// Define our handlers
const handlers = {};

handlers.ping = (data, callback) => {
  callback(200);
};

const greetingMaker = () => {
  const greetings = [
    "Hi there, skip!",
    "Hello, my friend! How can I help you?",
    "What's up?",
    "Sorry, you've found us but we're not here right now.",
    "Right address, but we're on vacation at the moment.",
    "This is the place... but where is everyone?"
  ];
  const getRandomNumber = Math.floor(Math.random() * greetings.length);
  const greetingJSON = { greeting: greetings[getRandomNumber] };
  return greetingJSON;
};

handlers.hello = (data, callback) => {
  callback(200, greetingMaker());
};

handlers.users = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// User Handlers
handlers._users = {};
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 10
      ? data.payload.password.trim()
      : false;
  const tosAgreement =
    typeof data.payload.tosAgreement === "boolean" &&
    data.payload.tosAgreement === true
      ? true
      : false;
  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure user doesn't already exist.
    _data.read("users", phone, (err, data) => {
      if (err) {
        // Hash the password.
        const hashedPassword = helpers.hash(password);
        if (hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true
          };

          // Store the user
          _data.create("users", phone, userObject, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { "error:": "could not create new user" });
            }
          });
        } else {
          callback(500, { "error:": "could not hash password." });
        }
      } else {
        callback(400, {
          "Error:": "A user with that phone number already exists."
        });
      }
    });
  } else {
    callback(400, { "Error:": "Missing required field(s)." });
  }
};

// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    handlers._tokens.verifyTokens(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404, "user is not found");
          }
        });
      } else {
        callback(403, {
          "Error:": "Missing required token in header, or token is invalid."
        });
      }
    });
  } else {
    callback(400, { "error:": "missing required field" });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password
handlers._users.put = (data, callback) => {
  // check for required field
  const phone =
    typeof data.payload.phone === "string" &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

  // check for optional fields
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 10
      ? data.payload.password.trim()
      : false;

  if (phone) {
    if (firstName || lastName || password) {
      const token =
        typeof data.headers.token === "string" ? data.headers.token : false;
      handlers._tokens.verifyTokens(token, phone, tokenIsValid => {
        if (tokenIsValid) {
          _data.read("users", phone, (err, userData) => {
            if (!err) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              _data.update("users", phone, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: "could not update the user." });
                }
              });
            } else {
              callback(400, {
                "Error:": "This user does not appear to exist."
              });
            }
          });
        } else {
          callback(403, {
            "Error:": "Missing required token in header, or token is invalid."
          });
        }
      });
    } else {
      callback(400, { "Error:": "Missing field(s) to update" });
    }
  } else {
    callback(400, { "Error:": "missing required field" });
  }
};

// Require: phone
// @TODO Clean up (delete) any other data files associated with this user.
handlers._users.delete = (data, callback) => {
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    handlers._tokens.verifyTokens(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            _data.delete("users", phone, err => {
              if (!err) {
                callback(200);
              } else {
                callback(500, {
                  "Error:": "Could not delete the specified user."
                });
              }
            });
          } else {
            callback(400, { "Error:": "Could not find the specified user." });
          }
        });
      } else {
        callback(403, {
          "Error:": "Missing required token in header, or token is invalid."
        });
      }
    });
  } else {
    callback(400, { "error:": "missing required field" });
  }
};

// Tokens handlers
handlers.tokens = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = {};

// Tokens: post
// Required data: user, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  if (phone && password) {
    _data.read("users", phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password and compare to the password stored in the user object.
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a new token with a random name and set experiation date 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60; // 1000 ms, 60 s/m, 60 m/h
          const tokenObject = {
            phone,
            id: tokenId,
            expires
          };
          _data.create("tokens", tokenId, tokenObject, err => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { "Error:": "Could not create the new token." });
            }
          });
        } else {
          callback(400, {
            "Error:":
              "Password did not match the specified user's stored password."
          });
        }
      } else {
        callback(400, { "Error:": "Could not find the specified user." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)." });
  }
};

// Tokens: get
// Required data: ID
// Optional data: none
handlers._tokens.get = (data, callback) => {
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, "Token is not found");
      }
    });
  } else {
    callback(400, { "Error:": "Cannot get token; missing required field" });
  }
};

// Tokens: put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const extend = typeof data.payload.extend == "boolean" ? true : false;
  if (id && extend) {
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          _data.update("tokens", id, tokenData, err => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { "Error:": "could not extend token" });
            }
          });
        } else {
          callback(400, {
            "Error:": "the token has already expired and cannot be extended."
          });
        }
      } else {
        callback(400, { "Error:": "specified token does not exist." });
      }
    });
  } else {
    callback(400, {
      "Error:": "Missing required field(s), or fields are invalid."
    });
  }
};

// Tokens: delete
// Required data: ID
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read("tokens", id, (err, data) => {
      if (!err && data) {
        _data.delete("tokens", id, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, {
              "Error:": "Could not delete the specified token."
            });
          }
        });
      } else {
        callback(400, { "Error:": "Could not find the specified token." });
      }
    });
  } else {
    callback(400, { "error:": "missing required field" });
  }
};

// Verify if a given token id is valid for a given user
handlers._tokens.verifyTokens = (id, phone, callback) => {
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks handlers
handlers.checks = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 == 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
  if (protocol && url && method && successCodes && timeoutSeconds) {
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    _data.read("tokens", token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        _data.read("users", userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks =
              typeof userData.checks === "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            // Verify the user has less than the number of max checks per user
            if (userChecks.length < config.maxChecks) {
              // Create a random ID for the check
              const checkId = helpers.createRandomString(20);

              // Create checkObject and include user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };

              _data.create("checks", checkId, checkObject, err => {
                if (!err) {
                  // Add the check ID to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new userData
                  _data.update("users", userPhone, userData, err => {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        "Error:":
                          "Could not update the user with the new check."
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not create the new check." });
                }
              });
            } else {
              callback(400, {
                "Error:": `User already has the maximum number of checks (${
                  config.maxChecks
                }).`
              });
            }
          } else {
            callback(403, { "Error:": "Unauthorized access." });
          }
        });
      } else {
        callback(403, { "Error:": "Token data is invalid or does not exist." });
      }
    });
  } else {
    callback(400, {
      "Error:": "Missing required inputs, or inputs are invalid."
    });
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        const token =
          typeof data.headers.token === "string" ? data.headers.token : false;
        handlers._tokens.verifyTokens(
          token,
          checkData.userPhone,
          tokenIsValid => {
            if (tokenIsValid) {
              callback(200, checkData);
            } else {
              callback(403, {
                "Error:":
                  "Missing required token in header, or token is invalid."
              });
            }
          }
        );
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { "error:": "missing required field" });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = (data, callback) => {
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
  if (id) {
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          const token =
            typeof data.headers.token === "string" ? data.headers.token : false;
          handlers._tokens.verifyTokens(
            token,
            checkData.userPhone,
            tokenIsValid => {
              if (tokenIsValid) {
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }
                _data.update("checks", id, checkData, err => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { "Error:": "Error updating check." });
                  }
                });
              } else {
                callback(403);
              }
            }
          );
        } else {
          callback(400, { "Error:": "Check ID does not exist." });
        }
      });
    } else {
      callback(400, { "Error:": "Missing field(s) to update." });
    }
  } else {
    callback(400, { "Error:": "Missing required fields." });
  }
};

// Checks - delete
handlers._checks.delete = (data, callback) => {};

// Not-found handler
handlers.notFound = (data, callback) => {
  callback(404, {
    name: "Something went wrong! There's no gold at that address."
  });
};

module.exports = handlers;
