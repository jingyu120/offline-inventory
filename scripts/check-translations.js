const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const targetDirs = [
  path.join(__dirname, '../mobile-web/src/features'),
  path.join(__dirname, '../mobile-web/src/core/components'),
];

const attributeNamesToTrack = new Set([
  'label',
  'placeholder',
  'title',
  'header',
  'subtitle',
  'description',
  'message',
  'error',
  'success',
]);

// Exclude list
const excludeFiles = new Set(['translations.ts', 'i18n.tsx']);

// Helper to check if string contains letters (English or Burmese)
function hasLetters(str) {
  if (!str) return false;
  // Match any English letters or Burmese characters
  return /[a-zA-Z\u1000-\u109f]/.test(str);
}

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== '__tests__' && file !== 'tests' && file !== 'node_modules') {
        results = results.concat(getFiles(filePath));
      }
    } else {
      if (
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.spec.tsx') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx') &&
        !excludeFiles.has(file)
      ) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function checkTranslations() {
  let totalViolations = 0;
  const allFiles = targetDirs.flatMap(getFiles);

  console.log(`Scanning ${allFiles.length} files for hardcoded strings...`);

  allFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
    );
    const violations = findHardcodedStrings(sourceFile);

    if (violations.length > 0) {
      console.log(
        `\n❌ File: ${path.relative(path.join(__dirname, '..'), file)}`,
      );
      violations.forEach((v) => {
        console.log(`  Line ${v.line}:${v.character} - ${v.message}`);
        totalViolations++;
      });
    }
  });

  if (totalViolations > 0) {
    console.log(`\nTotal translation violations found: ${totalViolations}`);
    process.exit(1);
  } else {
    console.log('\n✅ No hardcoded strings found. Translation check passed!');
    process.exit(0);
  }
}

function findHardcodedStrings(sourceFile) {
  const violations = [];

  function report(node, message) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(),
    );
    violations.push({
      line: line + 1,
      character: character + 1,
      message,
    });
  }

  function checkStringLiteral(node, context) {
    const text = node.text;
    if (hasLetters(text)) {
      report(node, `Hardcoded string literal in ${context}: "${text}"`);
    }
  }

  function checkTemplateLiteral(node, context) {
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      if (hasLetters(text)) {
        report(node, `Hardcoded template literal in ${context}: "${text}"`);
      }
    }
  }

  function checkTemplateExpression(node, context) {
    if (hasLetters(node.head.text)) {
      report(
        node,
        `Hardcoded template string head in ${context}: "${node.head.text}"`,
      );
    }
    node.templateSpans.forEach((span) => {
      if (hasLetters(span.literal.text)) {
        report(
          span.literal,
          `Hardcoded template string span in ${context}: "${span.literal.text}"`,
        );
      }
    });
  }

  function checkExpression(expr, context) {
    if (!expr) return;
    if (ts.isStringLiteral(expr)) {
      checkStringLiteral(expr, context);
    } else if (ts.isNoSubstitutionTemplateLiteral(expr)) {
      checkTemplateLiteral(expr, context);
    } else if (ts.isTemplateExpression(expr)) {
      checkTemplateExpression(expr, context);
    } else if (ts.isBinaryExpression(expr)) {
      checkExpression(expr.left, context);
      checkExpression(expr.right, context);
    } else if (ts.isConditionalExpression(expr)) {
      checkExpression(expr.whenTrue, context);
      checkExpression(expr.whenFalse, context);
    }
  }

  function visit(node) {
    // Skip t(...) calls completely
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 't') {
        return; // Skip checking t(...) arguments
      }

      // Check Alert.alert calls
      if (ts.isPropertyAccessExpression(node.expression)) {
        const obj = node.expression.expression;
        const prop = node.expression.name;
        if (
          ts.isIdentifier(obj) &&
          obj.text === 'Alert' &&
          ts.isIdentifier(prop) &&
          prop.text === 'alert'
        ) {
          node.arguments.forEach((arg) => {
            checkExpression(arg, 'Alert argument');
          });
        }
      }
    }

    // Check JSX Text
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (hasLetters(text)) {
        report(node, `Hardcoded JSX text: "${text}"`);
      }
    }

    // Check JSX attributes
    if (ts.isJsxAttribute(node)) {
      const attrName = node.name.text;
      if (attributeNamesToTrack.has(attrName) && node.initializer) {
        const init = node.initializer;
        if (ts.isStringLiteral(init)) {
          checkStringLiteral(init, `JSX attribute "${attrName}"`);
        } else if (ts.isJsxExpression(init)) {
          checkExpression(init.expression, `JSX attribute "${attrName}"`);
        }
      }
    }

    // Check JsxExpression used as child of JsxElement or JsxFragment
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      checkExpression(node.expression, 'JSX Expression child');
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

checkTranslations();
