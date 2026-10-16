const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(__dirname, 'claude_code.txt');

// Các đuôi file muốn lấy
const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.html'];

let result = '';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            const ext = path.extname(file);
            if (validExtensions.includes(ext)) {
                const relativePath = path.relative(__dirname, fullPath);
                const content = fs.readFileSync(fullPath, 'utf8');
                result += `\n\n=== FILE: ${relativePath.replace(/\\/g, '/')} ===\n\n`;
                result += content;
            }
        }
    }
}

console.log('Đang gom code...');
walkDir(srcDir);
fs.writeFileSync(outputFile, result, 'utf8');
console.log('Xong! Hãy lấy file claude_code.txt gửi cho Claude.');