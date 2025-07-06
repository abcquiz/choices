#!/bin/bash

# Script pour convertir des fichiers Markdown en PDF
# Usage: ./md2pdf.sh fichier.md [fichier_sortie.pdf]

if [ $# -eq 0 ]; then
    echo "Usage: $0 fichier.md [fichier_sortie.pdf]"
    echo "Exemple: $0 document.md document.pdf"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${2:-${INPUT_FILE%.md}.pdf}"

# Vérifier que le fichier d'entrée existe
if [ ! -f "$INPUT_FILE" ]; then
    echo "Erreur: Le fichier '$INPUT_FILE' n'existe pas."
    exit 1
fi

# Vérifier l'extension .md
if [[ ! "$INPUT_FILE" =~ \.md$ ]]; then
    echo "Attention: Le fichier n'a pas l'extension .md"
fi

echo "Conversion de '$INPUT_FILE' vers '$OUTPUT_FILE'..."

# Méthode 1: Pandoc (recommandé)
if command -v pandoc &> /dev/null; then
    echo "Utilisation de pandoc..."
    pandoc "$INPUT_FILE" \
        -o "$OUTPUT_FILE" \
        --pdf-engine=xelatex \
        -V geometry:margin=2cm \
        -V fontsize=12pt \
        -V linestretch=1.5 \
        -V mainfont="DejaVu Sans" \
        --highlight-style=tango \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓ Conversion réussie avec pandoc!"
        echo "PDF créé: $OUTPUT_FILE"
        exit 0
    else
        # Essayer sans xelatex
        pandoc "$INPUT_FILE" -o "$OUTPUT_FILE" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✓ Conversion réussie avec pandoc (moteur par défaut)!"
            echo "PDF créé: $OUTPUT_FILE"
            exit 0
        fi
    fi
fi

# Méthode 2: wkhtmltopdf
if command -v wkhtmltopdf &> /dev/null; then
    echo "Utilisation de wkhtmltopdf..."
    # Créer un fichier HTML temporaire
    TEMP_HTML=$(mktemp --suffix=.html)
    
    # Convertir markdown en HTML avec un style basique
    if command -v markdown &> /dev/null; then
        markdown "$INPUT_FILE" > "$TEMP_HTML"
    elif command -v python3 &> /dev/null; then
        python3 -m markdown "$INPUT_FILE" > "$TEMP_HTML" 2>/dev/null
    fi
    
    if [ -s "$TEMP_HTML" ]; then
        # Ajouter du CSS pour améliorer le rendu
        cat > "${TEMP_HTML}.styled" << 'EOF'
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { 
    font-family: Arial, sans-serif; 
    line-height: 1.6; 
    max-width: 800px; 
    margin: 40px auto; 
    padding: 20px;
}
h1, h2, h3 { color: #333; }
code { 
    background: #f4f4f4; 
    padding: 2px 4px; 
    border-radius: 3px;
}
pre { 
    background: #f4f4f4; 
    padding: 10px; 
    border-radius: 5px; 
    overflow-x: auto;
}
blockquote { 
    border-left: 4px solid #ddd; 
    padding-left: 20px; 
    margin-left: 0;
    color: #666;
}
</style>
</head>
<body>
EOF
        cat "$TEMP_HTML" >> "${TEMP_HTML}.styled"
        echo "</body></html>" >> "${TEMP_HTML}.styled"
        
        wkhtmltopdf "${TEMP_HTML}.styled" "$OUTPUT_FILE" 2>/dev/null
        rm -f "$TEMP_HTML" "${TEMP_HTML}.styled"
        
        if [ $? -eq 0 ]; then
            echo "✓ Conversion réussie avec wkhtmltopdf!"
            echo "PDF créé: $OUTPUT_FILE"
            exit 0
        fi
    fi
fi

# Méthode 3: Via navigateur (avec Python)
if command -v python3 &> /dev/null; then
    echo "Tentative avec Python et weasyprint..."
    python3 << EOF 2>/dev/null
try:
    import markdown
    import weasyprint
    
    with open('$INPUT_FILE', 'r') as f:
        md_content = f.read()
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }}
            h1, h2, h3 {{ color: #333; }}
            code {{ background: #f4f4f4; padding: 2px 4px; }}
            pre {{ background: #f4f4f4; padding: 10px; overflow-x: auto; }}
            blockquote {{ border-left: 4px solid #ddd; padding-left: 20px; margin-left: 0; }}
        </style>
    </head>
    <body>
        {markdown.markdown(md_content, extensions=['extra', 'codehilite'])}
    </body>
    </html>
    """
    
    weasyprint.HTML(string=html_content).write_pdf('$OUTPUT_FILE')
    print("✓ Conversion réussie avec Python/weasyprint!")
except:
    exit(1)
EOF
    if [ $? -eq 0 ]; then
        echo "PDF créé: $OUTPUT_FILE"
        exit 0
    fi
fi

# Si aucune méthode n'a fonctionné
echo ""
echo "❌ Aucun outil de conversion n'est installé."
echo ""
echo "Pour installer les outils nécessaires:"
echo ""
echo "Option 1 - Pandoc (recommandé):"
echo "  sudo apt-get install pandoc texlive-xetex texlive-fonts-recommended"
echo ""
echo "Option 2 - wkhtmltopdf:"
echo "  sudo apt-get install wkhtmltopdf"
echo ""
echo "Option 3 - Python/weasyprint:"
echo "  pip3 install markdown weasyprint"
echo ""
echo "Après installation, relancez ce script."
exit 1