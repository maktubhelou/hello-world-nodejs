const crypto = require("crypto");
const config = require("./config");
const querystring = require("querystring");
const https = require("https");
const path = require("path");
const fs = require("fs");

const helpers = {};

helpers.hash = string => {
  if (typeof string === "string" && string.length > 0) {
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(string)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

helpers.createRandomString = strLength => {
  strLength =
    typeof strLength === "number" && strLength > 0 ? strLength : false;

  if (strLength) {
    const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let str = "";
    for (i = 0; i < 20; i++) {
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      str += randomCharacter;
    }
    return str;
  } else {
    return false;
  }
};

// Send an SMS via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate params
  phone =
    typeof phone === "string" && phone.trim().length === 10
      ? phone.trim()
      : false;
  msg =
    typeof msg === "string" && msg.trim().length > 0 && msg.trim().length < 1600
      ? msg.trim()
      : false;
  if (phone && msg) {
    // Configure request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: `+1${phone}`,
      Body: msg
    };
    // Configure request details
    const stringPayload = querystring.stringify(payload);
    const requestDetails = {
      protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path:
        "/2010-04-01/Accounts/" + config.twilio.accountSid + "/Messages.json",
      auth: config.twilio.accountSid + ":" + config.twilio.authToken,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate Request and send
    const req = https.request(requestDetails, res => {
      const status = res.statusCode;
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback("Status code returned was: " + status);
      }
    });

    // Bind to the error event so it doesn't get thrown.
    req.on("error", err => {
      callback(err);
    });

    req.write(stringPayload);

    req.end();
  } else {
    callback(400, { "Error:": "Given parameters were missing or invalid." });
  }
};

helpers.getTemplate = (templateName, data, callback) => {
  templateName =
    typeof templateName === "string" && templateName.length > 0
      ? templateName
      : false;
  data = typeof data === "object" && data !== null ? data : {};
  if (templateName) {
    const templateDir = path.join(__dirname, "/../templates/");
    fs.readFile(templateDir + templateName + ".html", "utf-8", (err, str) => {
      if (!err && str && str.length > 0) {
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback("No template could be found.");
      }
    });
  } else {
    callback("A valid template name was not specified");
  }
};

// Add the universal header and footer to a string and pass the provided data object to the header and footer.
helpers.addUniversalTemplates = (str, data, callback) => {
  str = typeof str === "string" && str.length > 0 ? str : "";
  data = typeof data === "object" && data !== null ? data : {};
  // Get header and footer and wrap around the string
  helpers.getTemplate("_header", data, (err, headerString) => {
    if (!err && headerString) {
      helpers.getTemplate("_footer", data, (err, footerString) => {
        if (!err && footerString) {
          // Add them all together
          const fullString = headerString + str + footerString;
          callback(false, fullString);
        } else {
          callback("could not find footer template.");
        }
      });
    } else {
      callback("could not find header template.");
    }
  });
};

// Take a given string and a data object and find/replace all the keys within it.
helpers.interpolate = (str, data) => {
  str = typeof str === "string" && str.length > 0 ? str : "";
  data = typeof data === "object" && data !== null ? data : {};

  // add the template globals to the data object prepending their keyname with global
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data["global." + keyName] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data object insert it's value in the string at the corresponding placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === "string") {
      const replace = data[key];
      const find = `{${key}}`;
      str = str.replace(find, replace);
    }
  }
  return str;
};

module.exports = helpers;
