// Quick test script to verify subscriber options functionality
// This can be run in the browser console to test the subscriberOptionsToJSON function

console.log("Testing subscriber options logging...");

// Simulate the subscriber options that would be created
const testSubscriberOptions1 = {
  allowedOrigin: undefined // No options set
};

const testSubscriberOptions2 = {
  allowedOrigin: "REMOTE" // Some locality value
};

// This would test our subscriberOptionsToJSON function logic
function testSubscriberOptionsToJSON(options) {
  const result = {
    allowedOrigin: options.allowedOrigin !== undefined
      ? `${options.allowedOrigin}` // In real implementation this would use getEnumLabel
      : undefined,
  };

  // Remove undefined values to keep the JSON clean
  return Object.fromEntries(
    Object.entries(result).filter(([_, value]) => value !== undefined)
  );
}

console.log("Test 1 - No options:", testSubscriberOptionsToJSON(testSubscriberOptions1));
console.log("Test 2 - With allowedOrigin:", testSubscriberOptionsToJSON(testSubscriberOptions2));

console.log("Subscriber options tests completed!");
