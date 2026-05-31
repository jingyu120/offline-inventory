const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const targetDirs = [
  path.join(__dirname, '../mobile-web/src'),
  path.join(__dirname, '../sync-server/src'),
  path.join(__dirname, '../shared-types/src'),
  path.join(__dirname, '../ui-components/src'),
];

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else {
      if (
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.spec.tsx') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx') &&
        !file.endsWith('.d.ts')
      ) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const allFiles = targetDirs.flatMap(getFiles);
console.log(`Found ${allFiles.length} files to scan.`);

let updatedCount = 0;

allFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
  );

  const replacements = [];

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      replacements.push({
        start: node.getStart(),
        end: node.getEnd(),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length > 0) {
    // Sort in reverse order to replace from the end of the file, preserving offsets
    replacements.sort((a, b) => b.start - a.start);
    let newContent = content;
    replacements.forEach((r) => {
      newContent =
        newContent.slice(0, r.start) + '$Any' + newContent.slice(r.end);
    });
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(
      `Updated ${path.relative(path.join(__dirname, '..'), file)}: replaced ${replacements.length} instance(s) of 'any'`,
    );
    updatedCount++;
  }
});

console.log(`Finished. Updated ${updatedCount} files.`);
