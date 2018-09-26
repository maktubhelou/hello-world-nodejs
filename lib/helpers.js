const crypto = require("crypto");
const config = require("./config");
const querystring = require("querystring");
const https = require("https");
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

module.exports = helpers;
