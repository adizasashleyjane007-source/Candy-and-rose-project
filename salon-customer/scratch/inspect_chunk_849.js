const fs = require('fs');
const path = require('path');

const chunksDir = path.join('.next', 'static', 'chunks');
if (fs.existsSync(chunksDir)) {
  const files = fs.readdirSync(chunksDir);
  for (const f of files) {
    if (f.startsWith('849') || f.includes('849')) {
      const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
      console.log('File:', f, 'size:', content.length);
      console.log('Sample snippet:', content.substring(0, 300));
      // find exported identifiers or strings
      const matches = content.match(/["']([a-zA-Z0-9_\-\.\/]{4,40})["']/g) || [];
      const uniq = Array.from(new Set(matches)).slice(0, 30);
      console.log('Sample strings:', uniq);
    }
  }
}
