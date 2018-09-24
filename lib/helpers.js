const crypto = require("crypto");
const config = require("./config");

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

module.exports = helpers;
