import fs from 'fs';
import path from 'path';

const dirs = ['app', 'components', 'lib', 'middleware.ts'];

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) return [dir];

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.json')) {
                results.push(file);
            }
        }
    });
    return results;
}

let allFiles = [];
dirs.forEach(d => {
    allFiles = allFiles.concat(walk(d));
});

let replacementsCount = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/tar[oó]logas/gi, function (match) {
        if (match === match.toUpperCase()) return 'CARTOMANTES';
        if (match[0] === match[0].toUpperCase()) return 'Cartomantes';
        return 'cartomantes';
    });

    content = content.replace(/tar[oó]loga/gi, function (match) {
        if (match === match.toUpperCase()) return 'CARTOMANTE';
        if (match[0] === match[0].toUpperCase()) return 'Cartomante';
        return 'cartomante';
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replacementsCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Replaced in ${replacementsCount} files.`);
