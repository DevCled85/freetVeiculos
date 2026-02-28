import fs from 'fs';
import path from 'path';

const directoryPath = 'c:\\Users\\cleds\\Downloads\\fleetcheck---gestão-de-frota\\freetVeiculos\\src\\components';
const files = fs.readdirSync(directoryPath).filter((file: string) => file.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(directoryPath, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Colors
    content = content.replace(/emerald/g, 'primary');
    content = content.replace(/zinc/g, 'slate');

    // Refined Shapes & Shadows
    content = content.replace(/shadow-sm/g, 'shadow-elegant');
    content = content.replace(/rounded-lg/g, 'rounded-xl');
    content = content.replace(/rounded-md/g, 'rounded-lg');

    fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Mass replacement completed for components.');
