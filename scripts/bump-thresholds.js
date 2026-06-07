const fs = require('fs');
const path = require('path');

const workspaces = [
  'mobile-web',
  'sync-server',
  'ui-components',
  'shared-types',
];
const rootDir = path.resolve(__dirname, '..');

console.log('🤖 Checking for Jest coverage updates to bump thresholds...');

workspaces.forEach((workspace) => {
  const summaryPath = path.join(
    rootDir,
    'coverage',
    workspace,
    'coverage-summary.json',
  );
  let configPath = path.join(rootDir, workspace, 'jest.config.js');
  if (!fs.existsSync(configPath)) {
    configPath = path.join(rootDir, workspace, 'jest.config.cjs');
  }

  if (!fs.existsSync(summaryPath)) {
    console.log(
      `⚠️  No coverage summary found for ${workspace} at ${summaryPath}. Skipping.`,
    );
    return;
  }

  if (!fs.existsSync(configPath)) {
    console.log(
      `⚠️  No jest.config.js or jest.config.cjs found for ${workspace} at ${configPath}. Skipping.`,
    );
    return;
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const getFloat = (val) => Number(val.toFixed(2));
    const actual = {
      statements: getFloat(summary.total.statements.pct),
      branches: getFloat(summary.total.branches.pct),
      functions: getFloat(summary.total.functions.pct),
      lines: getFloat(summary.total.lines.pct),
    };

    const configContent = fs.readFileSync(configPath, 'utf8');
    const thresholdRegex = /coverageThreshold:\s*\{\s*global:\s*\{([^}]+)\}/s;
    const match = configContent.match(thresholdRegex);

    if (!match) {
      console.log(
        `⚠️  Could not parse coverageThreshold from ${workspace} config. Skipping.`,
      );
      return;
    }

    const blockText = match[1];
    let updatedBlockText = blockText;
    let changed = false;

    const metrics = ['statements', 'branches', 'functions', 'lines'];
    for (const metric of metrics) {
      const metricRegex = new RegExp(`(${metric}):\\s*(\\d+(?:\\.\\d+)?)`);
      const metricMatch = blockText.match(metricRegex);
      if (metricMatch) {
        const currentVal = parseFloat(metricMatch[2]);
        const newVal = actual[metric];
        if (newVal > currentVal) {
          console.log(
            `📈 [${workspace}] Bumping ${metric} threshold: ${currentVal}% -> ${newVal}%`,
          );
          updatedBlockText = updatedBlockText.replace(
            metricRegex,
            `$1: ${newVal}`,
          );
          changed = true;
        }
      }
    }

    if (changed) {
      const newConfigContent = configContent.replace(
        blockText,
        updatedBlockText,
      );
      fs.writeFileSync(configPath, newConfigContent, 'utf8');
      console.log(`✅ [${workspace}] Successfully updated jest.config.js!`);
    } else {
      console.log(
        `➖ [${workspace}] Coverage did not exceed current thresholds.`,
      );
    }
  } catch (err) {
    console.error(`❌ Error processing ${workspace}:`, err);
  }
});
