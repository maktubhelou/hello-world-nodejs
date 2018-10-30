/* 
* Test Runner
*
*/

// Override the NODE_ENV variable
process.env.NODE_ENV = "testing";

// Application logic for test runner.
_app = {};

// Container test
_app.tests = {};
_app.tests.unit = require("./unit");
_app.tests.api = require("./api");

_app.countTests = () => {
  let counter = 0;
  for (key in _app.tests) {
    if (_app.tests.hasOwnProperty(key)) {
      let subTests = _app.tests[key];
      for (testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          counter++;
        }
      }
    }
  }
  return counter;
};

_app.produceTestReport = (limit, successes, errors) => {
  console.log("");
  console.log("------------------ BEGIN TEST REPORT ------------------");
  console.log("");
  console.log("Total Tests: ", limit);
  console.log("Pass: ", successes);
  console.log("Fails: ", errors.length);
  console.log("");
  // If there are errors print them in detail
  if (errors.length > 0) {
    console.log("------------------ BEGIN ERROR DETAILS ------------------");
    errors.forEach(testError => {
      console.log("\x1b[31m%s\x1b[0m", testError.name);
      console.log(testError.error);
      console.log("");
    });
    console.log("------------------ END ERROR DETAILS   ------------------");
  }

  console.log("");
  console.log("------------------ END TEST REPORT ------------------");
  process.exit(0);
};

// Run all the tests collecting the errors and successes
_app.runTests = () => {
  const errors = [];
  let successes = 0;
  const limit = _app.countTests();
  let counter = 0;
  for (key in _app.tests) {
    if (_app.tests.hasOwnProperty(key)) {
      const subTests = _app.tests[key];
      for (testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          (() => {
            const tmpTestName = testName;
            const testValue = subTests[testName];
            // Call the test
            try {
              testValue(() => {
                // If it calls back without throwing, then it succeeded.
                console.log("\x1b[32m%s\x1b[0m", tmpTestName);
                counter++;
                successes++;
                if (counter === limit) {
                  // This or the one in the catch below will come first and end the test.
                  _app.produceTestReport(limit, successes, errors);
                }
              });
            } catch (e) {
              // If it throws, capture the error thrown and log it.
              errors.push({
                name: testName,
                error: e
              });
              console.log("\x1b[31m%cs\x1b[0m", tmpTestName);
              counter++;
              if (counter === limit) {
                _app.produceTestReport(limit, successes, errors);
              }
            }
          })();
        }
      }
    }
  }
};

// Run the test
_app.runTests();
