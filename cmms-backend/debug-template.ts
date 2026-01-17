
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const templatePath = path.join(__dirname, 'templates', 'repairs', 'B03.docx');

if (!fs.existsSync(templatePath)) {
    console.error('Template B03.docx not found at:', templatePath);
    process.exit(1);
}

const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const xml = zip.files['word/document.xml'].asText();

// Check for broken placeholders
// A good placeholder looks like: <w:t>{device_name}</w:t>
// A broken one looks like: <w:t>{</w:t> ... <w:t>device_name</w:t> ... <w:t>}</w:t>

console.log('--- XML Content Analysis ---');

const placeholders = [
    'device_name', 'plate_number', 'reason', 'solution', 
    'day', 'month', 'year', 'id'
];

placeholders.forEach(ph => {
    if (xml.includes(`{${ph}}`)) {
        console.log(`✅ Placeholder {${ph}} is intact.`);
    } else {
        console.log(`❌ Placeholder {${ph}} is NOT found as a contiguous string.`);
        // Try to find parts
        if (xml.includes(ph)) {
            console.log(`   found "${ph}" in XML, but not inside curly braces correctly.`);
        } else {
             console.log(`   "${ph}" text strictly not found in XML.`);
        }
    }
});

console.log('\n--- First 500 chars of XML ---');
console.log(xml.substring(0, 500));
