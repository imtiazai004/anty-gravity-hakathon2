import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
      walkDir(dirPath, callback);
    } else if (!isDirectory && (dirPath.endsWith('.js') || dirPath.endsWith('.jsx') || dirPath.endsWith('.html') || dirPath.endsWith('.css'))) {
      callback(path.join(dir, f));
    }
  });
}

const dir = 'c:\\anty gravity';

walkDir(dir, function(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content.replace(/ReportAnalyzer/g, 'ReportAnalyzer')
                          .replace(/reportAnalyzer/g, 'reportAnalyzer')
                          .replace(/REPORT_ANALYZER/g, 'REPORT_ANALYZER');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log('Fixed: ' + filePath);
  }
});
