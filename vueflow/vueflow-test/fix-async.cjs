// Script to remove 'async' from execute functions that don't use await
const fs = require('fs');
const path = require('path');

const files = [
  'src/commands/fileCommands.ts',
  'src/commands/editCommands.ts',
  'src/commands/viewCommands.ts',
  'src/commands/mindmapCommands.ts',
  'src/commands/writerCommands.ts',
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace 'execute: async () => {' with 'execute: () => {'
  content = content.replace(/execute: async \(\) => \{/g, 'execute: () => {');
  
  // Replace 'execute: async (context) => {' with 'execute: (context) => {'
  content = content.replace(/execute: async \(context\) => \{/g, 'execute: (context) => {');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
});

console.log('Done!');

