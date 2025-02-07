# TODO

- [ ] Si un url est donné sans http ni https au début : alors concater sa valeur à la baseUrl+"/"+quizCode
- [x] Pouvoir lancer le quiz en appuyant sur entrée (en plus du bouton)
- [ ] Ne pas avoir à saisir le nom, code et quiz si les infos sont données dans l'url (query params)
- [ ] Dans le résultat final, afficher : le nom, le quiz, la note, le md5 (avec code du quiz comme salt) "note, nom, quiz, date", la date
- [ ] Page x/n - Question  i/z
- [ ] afficher les chrono en h m s
- [x] ajouter un feedback d'explication de la réponse, bonne ou mauvaise afin que l'élève comprenne c'est ok ou pas ok
- [x] Ajouter une entrée topic
- [x] dans la note finale, montrer les points par topic
- [x] Traduire la note sur 20
- [x] generer un QR code pour le message (ex json ou texte) de la note
- [ ] Reprendre en cas de refresh pour éviter les triches ou les pb navigateurs : enregistrement dans le stockage local du navigateur
- [ ] Le chrono d'une question commence uniquement à partir du moment où la question est affichée à l'écran, pas avant
- [ ] avoir une config qui permet d'afficher ou pas le bouton "précédent" (ex showPreviousQuestionButton=true/false)
- [ ] Afficher la version du quiz et sa date release
- [ ] Ajouter un loading