#!/usr/bin/env node

const { runAllTests } = require('./basic-tests.cjs');

const success = runAllTests();
if (success) {
    console.log('\n========================================');
    console.log('STATIC CHECKS (basic-tests): PASS');
    console.log('========================================\n');
    console.log('npm test: Vitest + static checks — ALL PASSED\n');
}
process.exit(success ? 0 : 1);
