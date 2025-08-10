'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
  Loader2,
  Globe,
  MessageSquare,
  Database,
  Eye,
  Settings,
  ArrowRight,
  Edit3,
  Check,
} from 'lucide-react';

export default function EnhancedCypressGenerator() {
  const [url, setUrl] = useState('');
  const [userStory, setUserStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copiedSection, setCopiedSection] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    testCode: true,
    output: false,
    errorOutput: true,
  });

  // New state for data flow options
  const [flowOption, setFlowOption] = useState(1); // 1 or 2
  const [step, setStep] = useState('input'); // 'input', 'data-review', 'test-ready'
  const [requiredData, setRequiredData] = useState(null);
  const [userProvidedData, setUserProvidedData] = useState({});
  const [generatedTestCode, setGeneratedTestCode] = useState('');

  const handleInitialSubmit = async () => {
    if (flowOption === 1) {
      // Option 1: Generate test first, then ask for data
      await generateTestAndExtractData();
    } else {
      // Option 2: Extract required data first, then generate test
      await extractRequiredData();
    }
  };

  const generateTestAndExtractData = async () => {
    setLoading(true);
    setError('');

    try {
      // First generate the test code
      const testResponse = await fetch('/api/extract-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userStory, extractDataOnly: false }),
      });

      const testData = await testResponse.json();
      setGeneratedTestCode(testData.testCode);

      // Then extract required data from the generated test
      const dataResponse = await fetch('/api/extract-required-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCode: testData.testCode, userStory }),
      });

      const dataResult = await dataResponse.json();
      setRequiredData(dataResult.requiredData);
      setStep('data-review');
    } catch (err) {
      setError(err.message || 'Failed to generate test and extract data');
    } finally {
      setLoading(false);
    }
  };

  const extractRequiredData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/extract-required-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userStory, extractOnly: true }),
      });

      const dataResult = await response.json();
      setRequiredData(dataResult.requiredData);
      setStep('data-review');
    } catch (err) {
      setError(err.message || 'Failed to extract required data');
    } finally {
      setLoading(false);
    }
  };

  const handleDataSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      let testCode = generatedTestCode;

      // If option 2, generate test code now with the provided data
      if (flowOption === 2) {
        const testResponse = await fetch('/api/extract-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            userStory,
            testData: userProvidedData,
          }),
        });

        const testResult = await testResponse.json();
        testCode = testResult.testCode;
        setGeneratedTestCode(testCode);
      }

      // Run the test with provided data
      const runResponse = await fetch('/api/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCode,
          testData: userProvidedData,
          url,
        }),
      });

      const runResult = await runResponse.json();
      setResult(runResult);
      setStep('test-ready');
    } catch (err) {
      setError(err.message || 'Failed to run test');
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = (field, value) => {
    setUserProvidedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const copyToClipboard = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const resetFlow = () => {
    setStep('input');
    setRequiredData(null);
    setUserProvidedData({});
    setGeneratedTestCode('');
    setResult(null);
    setError('');
  };

  const parseTestStats = (output) => {
    const stats = {
      total: 0,
      passing: 0,
      failing: 0,
      skipped: 0,
      duration: '0s',
    };
    if (!output) return stats;

    const testsMatch = output.match(/Tests:\s+(\d+)/);
    const passingMatch = output.match(/Passing:\s+(\d+)/);
    const failingMatch = output.match(/Failing:\s+(\d+)/);
    const skippedMatch = output.match(/Skipped:\s+(\d+)/);
    const durationMatch = output.match(/Duration:\s+([^\n]+)/);

    if (testsMatch) stats.total = parseInt(testsMatch[1]);
    if (passingMatch) stats.passing = parseInt(passingMatch[1]);
    if (failingMatch) stats.failing = parseInt(failingMatch[1]);
    if (skippedMatch) stats.skipped = parseInt(skippedMatch[1]);
    if (durationMatch) stats.duration = durationMatch[1].trim();

    return stats;
  };

  const stats = result ? parseTestStats(result.output) : null;

  return (
    <div className='p-6 max-w-5xl mx-auto'>
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
        <h1 className='text-3xl font-bold mb-6 text-gray-900'>
          Enhanced Cypress Test Generator
        </h1>

        {/* Flow Option Selection */}
        {step === 'input' && (
          <div className='mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200'>
            <h3 className='text-lg font-semibold text-blue-900 mb-3'>
              Choose Your Workflow
            </h3>
            <div className='space-y-3'>
              <label className='flex items-start space-x-3 cursor-pointer'>
                <input
                  type='radio'
                  name='flowOption'
                  value={1}
                  checked={flowOption === 1}
                  onChange={() => setFlowOption(1)}
                  className='mt-1'
                />
                <div>
                  <div className='font-medium text-blue-900'>
                    Option 1: Test-First Approach
                  </div>
                  <div className='text-sm text-blue-700'>
                    Generate test → Review required data → Provide data → Run
                    test
                  </div>
                </div>
              </label>
              <label className='flex items-start space-x-3 cursor-pointer'>
                <input
                  type='radio'
                  name='flowOption'
                  value={2}
                  checked={flowOption === 2}
                  onChange={() => setFlowOption(2)}
                  className='mt-1'
                />
                <div>
                  <div className='font-medium text-blue-900'>
                    Option 2: Data-First Approach
                  </div>
                  <div className='text-sm text-blue-700'>
                    Extract required data → Provide data → Generate test → Run
                    test
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className='mb-6'>
          <div className='flex items-center space-x-4'>
            <div
              className={`flex items-center space-x-2 ${
                step === 'input' ? 'text-blue-600' : 'text-green-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  step === 'input'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-green-600 bg-green-50'
                }`}
              >
                {step === 'input' ? '1' : <Check className='w-4 h-4' />}
              </div>
              <span className='font-medium'>Initial Input</span>
            </div>
            <ArrowRight className='w-4 h-4 text-gray-400' />
            <div
              className={`flex items-center space-x-2 ${
                step === 'data-review'
                  ? 'text-blue-600'
                  : step === 'test-ready'
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  step === 'data-review'
                    ? 'border-blue-600 bg-blue-50'
                    : step === 'test-ready'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300'
                }`}
              >
                {step === 'test-ready' ? <Check className='w-4 h-4' /> : '2'}
              </div>
              <span className='font-medium'>Data Review</span>
            </div>
            <ArrowRight className='w-4 h-4 text-gray-400' />
            <div
              className={`flex items-center space-x-2 ${
                step === 'test-ready' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  step === 'test-ready'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                3
              </div>
              <span className='font-medium'>Test Execution</span>
            </div>
          </div>
        </div>

        {/* Input Form - Step 1 */}
        {step === 'input' && (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <Globe className='inline w-4 h-4 mr-1' />
                Target URL
              </label>
              <input
                type='text'
                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='Enter URL (e.g. https://example.com/login)'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <MessageSquare className='inline w-4 h-4 mr-1' />
                User Story
              </label>
              <textarea
                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                rows={4}
                placeholder='Enter user story (e.g. As a user, I want to log in to my account so that I can access my dashboard)'
                value={userStory}
                onChange={(e) => setUserStory(e.target.value)}
              />
            </div>

            <button
              onClick={handleInitialSubmit}
              disabled={loading || !url || !userStory}
              className='w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span>
                    {flowOption === 1
                      ? 'Generating Test & Extracting Data...'
                      : 'Extracting Required Data...'}
                  </span>
                </>
              ) : (
                <>
                  <Settings className='w-5 h-5' />
                  <span>
                    {flowOption === 1
                      ? 'Generate Test & Extract Data'
                      : 'Extract Required Data'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Data Review - Step 2 */}
        {step === 'data-review' && requiredData && (
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <h2 className='text-2xl font-bold text-gray-900'>
                Review Required Test Data
              </h2>
              <button
                onClick={resetFlow}
                className='px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Start Over
              </button>
            </div>

            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
              <div className='flex items-start space-x-3'>
                <Database className='w-5 h-5 text-yellow-600 mt-0.5' />
                <div>
                  <h4 className='font-medium text-yellow-900 mb-2'>
                    Data Required for Testing
                  </h4>
                  <p className='text-yellow-800 text-sm'>
                    Please provide the following data that will be used in your
                    test execution:
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Test Code Preview (for Option 1) */}
            {flowOption === 1 && generatedTestCode && (
              <div className='bg-white border border-gray-200 rounded-lg'>
                <div className='p-4 border-b border-gray-200'>
                  <div className='flex items-center space-x-2'>
                    <Eye className='w-5 h-5 text-blue-500' />
                    <h3 className='text-lg font-semibold text-gray-900'>
                      Generated Test Code Preview
                    </h3>
                  </div>
                </div>
                <div className='p-4'>
                  <pre className='bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-64'>
                    <code>{generatedTestCode}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Data Input Fields */}
            <div className='space-y-4'>
              {requiredData.map((field, index) => (
                <div
                  key={index}
                  className='bg-gray-50 p-4 rounded-lg border border-gray-200'
                >
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    <Edit3 className='inline w-4 h-4 mr-1' />
                    {field.name}
                  </label>
                  <p className='text-sm text-gray-600 mb-2'>
                    {field.description}
                  </p>
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder={
                      field.placeholder || `Enter ${field.name.toLowerCase()}`
                    }
                    value={userProvidedData[field.key] || ''}
                    onChange={(e) => updateUserData(field.key, e.target.value)}
                  />
                  {field.required && (
                    <p className='text-xs text-red-600 mt-1'>
                      * This field is required
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleDataSubmit}
              disabled={loading}
              className='w-full px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center space-x-2'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span>
                    {flowOption === 1
                      ? 'Running Test...'
                      : 'Generating & Running Test...'}
                  </span>
                </>
              ) : (
                <>
                  <Play className='w-5 h-5' />
                  <span>
                    {flowOption === 1
                      ? 'Run Test with Data'
                      : 'Generate & Run Test'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-center space-x-2'>
              <XCircle className='w-5 h-5 text-red-500' />
              <span className='text-red-700 font-medium'>Error</span>
            </div>
            <p className='text-red-600 mt-1'>{error}</p>
          </div>
        )}
      </div>

      {/* Test Results - Step 3 */}
      {step === 'test-ready' && result && (
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <h2 className='text-2xl font-bold text-gray-900'>Test Results</h2>
            <button
              onClick={resetFlow}
              className='px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Run New Test
            </button>
          </div>

          {/* Test Status */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center space-x-3'>
                {result.passed ? (
                  <CheckCircle className='w-8 h-8 text-green-500' />
                ) : (
                  <XCircle className='w-8 h-8 text-red-500' />
                )}
                <div>
                  <h3 className='text-xl font-bold text-gray-900'>
                    {result.passed ? 'Test Passed' : 'Test Failed'}
                  </h3>
                  <p className='text-gray-600'>{result.testFilePath}</p>
                </div>
              </div>
            </div>

            {stats && (
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='bg-gray-50 p-4 rounded-lg text-center'>
                  <div className='text-2xl font-bold text-gray-900'>
                    {stats.total}
                  </div>
                  <div className='text-sm text-gray-600'>Total Tests</div>
                </div>
                <div className='bg-green-50 p-4 rounded-lg text-center'>
                  <div className='text-2xl font-bold text-green-600'>
                    {stats.passing}
                  </div>
                  <div className='text-sm text-green-600'>Passing</div>
                </div>
                <div className='bg-red-50 p-4 rounded-lg text-center'>
                  <div className='text-2xl font-bold text-red-600'>
                    {stats.failing}
                  </div>
                  <div className='text-sm text-red-600'>Failing</div>
                </div>
                <div className='bg-yellow-50 p-4 rounded-lg text-center'>
                  <div className='text-2xl font-bold text-yellow-600'>
                    {stats.skipped}
                  </div>
                  <div className='text-sm text-yellow-600'>Skipped</div>
                </div>
              </div>
            )}
          </div>

          {/* Generated Test Code */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
            <div className='p-4 border-b border-gray-200'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <FileText className='w-5 h-5 text-blue-500' />
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Final Test Code
                  </h3>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedTestCode, 'testCode')}
                  className='flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors'
                >
                  <Copy className='w-4 h-4' />
                  <span className='text-sm'>
                    {copiedSection === 'testCode' ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
            </div>
            <div className='p-4'>
              <pre className='bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto'>
                <code>{generatedTestCode}</code>
              </pre>
            </div>
          </div>

          {/* Test Output */}
          {result.output && (
            <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
              <div className='p-4 border-b border-gray-200'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <Play className='w-5 h-5 text-green-500' />
                    <h3 className='text-lg font-semibold text-gray-900'>
                      Execution Output
                    </h3>
                  </div>
                  <button
                    onClick={() => toggleSection('output')}
                    className='flex items-center space-x-1 px-3 py-1 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors'
                  >
                    {expandedSections.output ? (
                      <ChevronUp className='w-4 h-4' />
                    ) : (
                      <ChevronDown className='w-4 h-4' />
                    )}
                    <span className='text-sm'>
                      {expandedSections.output ? 'Collapse' : 'Expand'}
                    </span>
                  </button>
                </div>
              </div>
              {expandedSections.output && (
                <div className='p-4'>
                  <pre className='bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 font-mono'>
                    <code>{result.output}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
