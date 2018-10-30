/*
* Library that demonstrates something throwing when its init() is called.
*
*/

// Container for the module
const example = {};

// Init()
example.init = () => {
  // Intentional reference error below.
  const foo = bar;
};

// Export the module
module.exports = example;
