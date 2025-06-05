// Quick test script to verify put options functionality
// This would be run in the browser console

console.log("Testing enhanced put options...");

// Test data simulating the new put options state
const testPutOptions = {
  showOptions: { value: true },
  encoding: { value: "" },
  customEncoding: { value: false },
  priority: { value: undefined },
  congestionControl: { value: undefined },
  express: { value: 'default' },
  reliability: { value: undefined },
  allowedDestination: { value: undefined },
  attachment: { value: "test attachment" },
  attachmentEmpty: { value: false },
};

const testPutOptionsEmpty = {
  showOptions: { value: true },
  encoding: { value: "" },
  customEncoding: { value: false },
  priority: { value: undefined },
  congestionControl: { value: undefined },
  express: { value: 'true' },
  reliability: { value: undefined },
  allowedDestination: { value: undefined },
  attachment: { value: "" },
  attachmentEmpty: { value: true },
};

// This would test our putOptionsStateTo function logic
function testPutOptionsStateTo(options) {
  let opts = {};
  
  if (options.encoding.value) {
    opts.encoding = `Encoding.fromString("${options.encoding.value}")`;
  }
  if (options.priority.value !== undefined) {
    opts.priority = options.priority.value;
  }
  if (options.congestionControl.value !== undefined) {
    opts.congestionControl = options.congestionControl.value;
  }
  if (options.express.value !== 'default') {
    opts.express = options.express.value === 'true';
  }
  if (options.reliability.value !== undefined) {
    opts.reliability = options.reliability.value;
  }
  if (options.allowedDestination.value !== undefined) {
    opts.allowedDestination = options.allowedDestination.value;
  }
  if (options.attachmentEmpty.value) {
    opts.attachment = 'new ZBytes("")';
  } else if (options.attachment.value) {
    opts.attachment = `new ZBytes("${options.attachment.value}")`;
  }
  
  return opts;
}

console.log("Test 1 - Normal attachment:", testPutOptionsStateTo(testPutOptions));
console.log("Test 2 - Empty attachment:", testPutOptionsStateTo(testPutOptionsEmpty));

console.log("Enhanced put options tests completed!");
