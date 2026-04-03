#!/usr/bin/env node

const { runAllTests } = require('./basic-tests.cjs');

console.log('');
console.log('════════════════════════════════════════════════════════════════');
console.log('  PART 1 of 2 — Static HTML/CSS checks (basic-tests.cjs)');
console.log('  Look for "5/5 tests passed" per suite and "5/5 test suites passed".');
console.log('════════════════════════════════════════════════════════════════');
console.log('');

const success = runAllTests();
if (success) {
    console.log('');
    console.log('────────────────────────────────────────────────────────────────');
    console.log('  PART 1 RESULT: PASS  (5/5 suites — see "SUMMARY: 5/5" above)');
    console.log('────────────────────────────────────────────────────────────────');
    console.log('');
}
process.exit(success ? 0 : 1);
