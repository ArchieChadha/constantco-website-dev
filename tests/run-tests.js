#!/usr/bin/env node

const { runAllTests } = require('./basic-tests');

// Run the tests
const success = runAllTests();

// Exit with appropriate code
process.exit(success ? 0 : 1);
