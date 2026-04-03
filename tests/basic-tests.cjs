const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Test 1: HTML Structure Test
function testHTMLStructure() {
  console.log('Test 1: HTML Structure');
  
  const htmlPath = path.join(__dirname, '../src/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  const tests = [
    {
      name: 'Has DOCTYPE declaration',
      test: () => dom.window.document.doctype !== null,
      pass: true
    },
    {
      name: 'Has html element with lang attribute',
      test: () => {
        const html = document.documentElement;
        return html.tagName === 'HTML' && html.getAttribute('lang') === 'en';
      },
      pass: true
    },
    {
      name: 'Has head and body elements',
      test: () => document.head !== null && document.body !== null,
      pass: true
    },
    {
      name: 'Has title tag',
      test: () => {
        const title = document.querySelector('title');
        return title !== null && title.textContent.includes('Constant & Co');
      },
      pass: true
    },
    {
      name: 'Has main element',
      test: () => document.querySelector('main') !== null,
      pass: true
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.test();
    console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    if (result) passed++;
  });
  
  console.log(`  Result: ${passed}/${tests.length} tests passed\n`);
  return passed === tests.length;
}

// Test 2: CSS Link Test
function testCSSLink() {
  console.log('Test 2: CSS Link');
  
  const htmlPath = path.join(__dirname, '../src/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  const cssLink = document.querySelector('link[rel="stylesheet"]');
  const hasCorrectHref = cssLink && cssLink.getAttribute('href') === 'style.css';
  
  console.log(`  ${hasCorrectHref ? '✅' : '❌'} CSS file is properly linked`);
  console.log(`  Result: ${hasCorrectHref ? 'PASS' : 'FAIL'}\n`);
  
  return hasCorrectHref;
}

// Test 3: CSS Syntax Test
function testCSSSyntax() {
  console.log('Test 3: CSS Syntax');
  
  const cssPath = path.join(__dirname, '../src/style.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  const tests = [
    {
      name: 'CSS file exists and is readable',
      test: () => cssContent.length > 0,
      pass: true
    },
    {
      name: 'Has CSS custom properties (variables)',
      test: () => cssContent.includes(':root') && cssContent.includes('--'),
      pass: true
    },
    {
      name: 'Has responsive design (media queries)',
      test: () => cssContent.includes('@media'),
      pass: true
    },
    {
      name: 'Uses modern CSS (Grid/Flexbox)',
      test: () => cssContent.includes('display: grid') || cssContent.includes('display: flex'),
      pass: true
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.test();
    console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    if (result) passed++;
  });
  
  console.log(`  Result: ${passed}/${tests.length} tests passed\n`);
  return passed === tests.length;
}

// Test 4: Accessibility Test
function testAccessibility() {
  console.log('Test 4: Accessibility');
  
  const htmlPath = path.join(__dirname, '../src/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  const tests = [
    {
      name: 'Has skip link for keyboard navigation',
      test: () => {
        const skipLink = document.querySelector('.skip');
        return skipLink && skipLink.getAttribute('href') === '#main';
      },
      pass: true
    },
    {
      name: 'Images have alt text',
      test: () => {
        const images = document.querySelectorAll('img');
        return Array.from(images).every(img => img.getAttribute('alt') && img.getAttribute('alt').trim() !== '');
      },
      pass: true
    },
    {
      name: 'Has proper heading hierarchy (h1 exists)',
      test: () => document.querySelector('h1') !== null,
      pass: true
    },
    {
      name: 'Has semantic HTML elements',
      test: () => {
        return document.querySelector('header') !== null && 
               document.querySelector('main') !== null && 
               document.querySelector('footer') !== null;
      },
      pass: true
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.test();
    console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    if (result) passed++;
  });
  
  console.log(`  Result: ${passed}/${tests.length} tests passed\n`);
  return passed === tests.length;
}

// Test 5: Content Structure Test
function testContentStructure() {
  console.log('Test 5: Content Structure');
  
  const htmlPath = path.join(__dirname, '../src/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  const tests = [
    {
      name: 'Has navigation menu',
      test: () => document.querySelector('nav') !== null,
      pass: true
    },
    {
      name: 'Has services section',
      test: () => document.querySelector('#services') !== null,
      pass: true
    },
    {
      name: 'Has contact section',
      test: () => document.querySelector('#contact') !== null,
      pass: true
    },
    {
      name: 'Has footer element',
      test: () => document.querySelector('footer') !== null,
      pass: true
    }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.test();
    console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    if (result) passed++;
  });
  
  console.log(`  Result: ${passed}/${tests.length} tests passed\n`);
  return passed === tests.length;
}

// Run all tests
function runAllTests() {
  console.log('Running Tests for Constant & Co Website\n');
  console.log('=' .repeat(50));
  
  const results = [
    testHTMLStructure(),
    testCSSLink(),
    testCSSSyntax(),
    testAccessibility(),
    testContentStructure()
  ];
  
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;
  
  console.log('=' .repeat(50));
  console.log(`SUMMARY: ${passedTests}/${totalTests} test suites passed`);
  
  if (passedTests === totalTests) {
    console.log(' All tests passed! Your website looks good.');
  } else {
    console.log('Some tests failed. Please check the issues above.');
  }
  
  return passedTests === totalTests;
}

module.exports = {
  testHTMLStructure,
  testCSSLink,
  testCSSSyntax,
  testAccessibility,
  testContentStructure,
  runAllTests
};