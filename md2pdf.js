#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Vérifier les arguments
if (process.argv.length < 3) {
    console.log('Usage: node md2pdf.js fichier.md [fichier_sortie.pdf]');
    process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace(/\.md$/, '.pdf');

// Vérifier que le fichier existe
if (!fs.existsSync(inputFile)) {
    console.error(`Erreur: Le fichier '${inputFile}' n'existe pas.`);
    process.exit(1);
}

console.log(`Conversion de '${inputFile}' vers '${outputFile}'...`);

// Lire le contenu markdown
const markdownContent = fs.readFileSync(inputFile, 'utf8');

// Convertir le markdown en HTML basique
function markdownToHtml(markdown) {
    let html = markdown;
    
    // Titres
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Citations
    html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Gras et italique
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code inline
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Listes
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*?)$/gm, '<li>$2</li>');
    
    // Paragraphes
    html = html.split('\n\n').map(para => {
        if (para.trim() && !para.startsWith('<')) {
            return `<p>${para}</p>`;
        }
        return para;
    }).join('\n\n');
    
    return html;
}

// Créer le HTML complet
const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(inputFile, '.md')}</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        h2 {
            color: #34495e;
            margin-top: 25px;
        }
        h3 {
            color: #7f8c8d;
            margin-top: 20px;
        }
        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 20px 0;
            color: #555;
            font-style: italic;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        strong {
            color: #2c3e50;
        }
        ul, ol {
            margin: 15px 0;
        }
        li {
            margin: 5px 0;
        }
        p {
            margin: 15px 0;
            text-align: justify;
        }
        @media print {
            body {
                font-size: 11pt;
            }
            h1 { page-break-before: auto; }
            h2, h3 { page-break-after: avoid; }
            blockquote, ul, ol { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    ${markdownToHtml(markdownContent)}
</body>
</html>`;

// Sauvegarder le HTML temporaire
const tempHtmlFile = outputFile.replace(/\.pdf$/, '_temp.html');
fs.writeFileSync(tempHtmlFile, htmlContent);

console.log('HTML généré, tentative de conversion en PDF...');

// Essayer d'ouvrir dans le navigateur pour impression manuelle
try {
    const platform = process.platform;
    let command;
    
    if (platform === 'linux') {
        command = `xdg-open "${tempHtmlFile}"`;
    } else if (platform === 'darwin') {
        command = `open "${tempHtmlFile}"`;
    } else if (platform === 'win32') {
        command = `start "${tempHtmlFile}"`;
    }
    
    if (command) {
        execSync(command);
        console.log(`\n✓ Le fichier HTML a été ouvert dans votre navigateur.`);
        console.log(`Pour créer le PDF :`);
        console.log(`1. Appuyez sur Ctrl+P (ou Cmd+P sur Mac)`);
        console.log(`2. Choisissez "Enregistrer en PDF" comme imprimante`);
        console.log(`3. Sauvegardez sous : ${outputFile}`);
        console.log(`\nFichier HTML temporaire : ${tempHtmlFile}`);
        console.log(`(Vous pouvez le supprimer après la conversion)`);
    }
} catch (error) {
    console.log(`\n✓ Fichier HTML créé : ${tempHtmlFile}`);
    console.log(`Ouvrez ce fichier dans un navigateur et imprimez-le en PDF (Ctrl+P).`);
}