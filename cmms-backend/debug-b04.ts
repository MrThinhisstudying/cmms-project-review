
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const templatePath = path.join(__dirname, 'templates', 'repairs', 'B04.docx');

if (!fs.existsSync(templatePath)) {
    console.error('Template B04.docx not found');
    process.exit(1);
}

const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const xml = zip.files['word/document.xml'].asText();

console.log('--- Inspecting B04 Template ---');
// Look for loop
if (xml.includes('{#materials}') && xml.includes('{/materials}')) {
    console.log('✅ Found materials loop');
} else {
    console.log('❌ Materials loop NOT found strictly');
}

// look for placeholders near materials
const vars = ['name', 'specifications', 'unit', 'quantity', 'note', 'code', 'item_code'];
vars.forEach(v => {
    if (xml.includes(`{${v}}`)) {
        console.log(`✅ Found {${v}}`);
    } else {
        console.log(`❌ {${v}} not found`);
    }
});
