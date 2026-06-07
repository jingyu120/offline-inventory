const fs = require('fs');
const path = require('path');

// CLI Arguments
const args = process.argv.slice(2);
const fromVal =
  args.find((arg) => arg.startsWith('--from='))?.split('=')[1] ||
  '@burma-inventory';
const toVal = args.find((arg) => arg.startsWith('--to='))?.split('=')[1];

if (!toVal) {
  console.error(
    '\x1b[31mError: Please specify the replacement name using --to=<new-name>.\x1b[0m',
  );
  console.log(
    'Example: \x1b[36mnode scripts/rename-project.js --to=@my-awesome-app\x1b[0m',
  );
  process.exit(1);
}

// Strip scopes to get clean names
const cleanFrom = fromVal.startsWith('@') ? fromVal.slice(1) : fromVal;
const cleanTo = toVal.startsWith('@') ? toVal.slice(1) : toVal;

// Casing conversion utilities
function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
function toSnakeCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^-|-$)/g, '');
}
function toCamelCase(str) {
  const kebab = toKebabCase(str);
  return kebab.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
function toTitleCase(str) {
  const kebab = toKebabCase(str);
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate all replacements variants
const replacements = [
  // 1. Scoped package names
  { from: `@${cleanFrom}`, to: `@${cleanTo}` },
  // 2. kebab-case (e.g. folder names, package names)
  { from: toKebabCase(cleanFrom), to: toKebabCase(cleanTo) },
  // 3. snake_case (e.g. database names, container names)
  { from: toSnakeCase(cleanFrom), to: toSnakeCase(cleanTo) },
  // 4. camelCase (e.g. variable names)
  { from: toCamelCase(cleanFrom), to: toCamelCase(cleanTo) },
  // 5. PascalCase (e.g. class names, modules)
  { from: toPascalCase(cleanFrom), to: toPascalCase(cleanTo) },
  // 6. Title Case (e.g. app titles, descriptions)
  { from: toTitleCase(cleanFrom), to: toTitleCase(cleanTo) },
];

console.log(
  `\x1b[33mRenaming project references (using multi-casing mapping):\x1b[0m`,
);
replacements.forEach((r) => console.log(`  "${r.from}" -> "${r.to}"`));

const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '.nx',
  'dist',
  'tmp',
  'uploads',
  'coverage',
  '.gemini',
];

const EXCLUDED_FILES = ['package-lock.json', 'rename-project.js'];

const EXTENSIONS_TO_PROCESS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.sh',
  '.yml',
  '.yaml',
];

let filesProcessed = 0;
let occurrencesReplaced = 0;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        walkDir(fullPath);
      }
    } else if (stat.isFile()) {
      if (EXCLUDED_FILES.includes(file)) continue;

      const ext = path.extname(file);
      if (
        EXTENSIONS_TO_PROCESS.includes(ext) ||
        file === '.gitignore' ||
        file === '.env'
      ) {
        processFile(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      // Prevent replacing if from/to are identical (which can happen if casings collide or input matches default)
      if (from === to) return;

      const regex = new RegExp(from, 'g');
      if (regex.test(content)) {
        const matches = content.match(regex);
        occurrencesReplaced += matches ? matches.length : 0;
        content = content.replace(regex, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(
        `\x1b[32mUpdated:\x1b[0m ${path.relative(process.cwd(), filePath)}`,
      );
      filesProcessed++;
    }
  } catch (err) {
    console.error(`\x1b[31mError processing file ${filePath}:\x1b[0m`, err);
  }
}

console.log('\x1b[35mStarting rename process...\x1b[0m');
walkDir(process.cwd());
console.log(`\x1b[32m\nRename completed successfully!\x1b[0m`);
console.log(`Files modified: ${filesProcessed}`);
console.log(`Total replacements: ${occurrencesReplaced}`);
