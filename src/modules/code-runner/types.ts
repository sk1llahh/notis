export interface TestCase {
  name?: string;
  input: any[];
  expected: any;
  description?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  logs: string[];
  executionTimeMs: number;
  error?: string;
  testResults?: TestResult[];
  allTestsPassed?: boolean;
}

export interface ExecuteCodeOptions {
  code: string;
  testCases?: TestCase[];
  timeoutMs?: number;
}
