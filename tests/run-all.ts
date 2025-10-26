import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Master Test Runner
 *
 * Runs all test suites in order and reports aggregate results
 */

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output: string;
}

const testSuites = [
  { name: 'Database Tests', file: 'tests/01-database.test.ts' },
  { name: 'Authentication Tests', file: 'tests/02-auth.test.ts' },
  { name: 'Booking Tests', file: 'tests/03-booking.test.ts' },
  { name: 'Appointment Tests', file: 'tests/04-appointments.test.ts' },
  { name: 'Audit Log Tests', file: 'tests/05-audit-logs.test.ts' },
  { name: 'Advisory Lock Tests (Step 7z)', file: 'tests/06-advisory-locks.test.ts' },
  { name: 'Database Trigger Tests (Step 7z)', file: 'tests/07-database-triggers.test.ts' },
  { name: 'Cleanup Resilience Tests (Step 7z)', file: 'tests/08-cleanup-resilience.test.ts' },
  { name: 'Load Tests (Step 7z)', file: 'tests/load-test.ts' },
];

async function runTestSuite(suite: { name: string; file: string }): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${suite.name}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(`tsx ${suite.file}`, {
      env: { ...process.env },
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    const duration = Date.now() - startTime;
    const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

    console.log(output);

    return {
      name: suite.name,
      passed: true,
      duration,
      output,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const output =
      (error.stdout || '') + (error.stderr ? `\nSTDERR:\n${error.stderr}` : '') + `\nError: ${error.message}`;

    console.log(output);

    return {
      name: suite.name,
      passed: false,
      duration,
      output,
    };
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          RHIVO - COMPREHENSIVE TEST SUITE                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log(`Starting test run at: ${new Date().toISOString()}`);
  console.log(`Total test suites: ${testSuites.length}`);
  console.log('\n');

  const results: TestResult[] = [];
  const overallStartTime = Date.now();

  // Run each test suite sequentially
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);

    // Short delay between test suites
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const overallDuration = Date.now() - overallStartTime;

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const durationSec = (result.duration / 1000).toFixed(2);
    console.log(`${status} ${result.name.padEnd(35)} (${durationSec}s)`);
  });

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalDurationSec = (overallDuration / 1000).toFixed(2);

  console.log('\n');
  console.log(`Total: ${passedCount} passed, ${failedCount} failed`);
  console.log(`Total duration: ${totalDurationSec}s`);
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log('\n');

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Review the output above for details.\n');
    process.exit(1);
  }
}

// Execute
runAllTests().catch(error => {
  console.error('Fatal error running test suite:', error);
  process.exit(1);
});