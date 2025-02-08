# TODO

## MVP
- [ ] pouvoir definir le baseUrl dans les query params: si renseigné, alors ça écrase le baseUrl qui est en dur dans le code
- [ ] Ajouter un loading
- [x] forcer le nettoyage du cache des quiz et config
- [x] ameliorer l'affichage des alert
- [x] - avoir deux configs shouldStartAfter, shouldStartBefore, optionnelles
- [x] - pouvoir charger des json (au lieu de js)
- [x] - avoir une config qui permet d'afficher ou pas le bouton "précédent"
- [x] tests pour l'affichage aléatoire de questions ou groupes de questions
- [x] shuffleQuestions: sera très pratique pour les cas d'un ou plusieurs groupes avec bcp de questions (surtout très pertinent si un seul group dans le quiz)
- [x] remplace "Groupe x/n" par "Page x/n"
- [x] Pouvoir lancer le quiz en appuyant sur entrée (en plus du bouton)
- [x] Dans le résultat final, afficher : le nom, le quiz, la note, le md5 (avec code du quiz comme salt) "note, nom, quiz, date", la date
- [x] Page x/n - Question  i/z
- [x] afficher les chrono en h m s
- [x] ajouter un feedback d'explication de la réponse, bonne ou mauvaise afin que l'élève comprenne c'est ok ou pas ok
- [x] Ajouter une entrée topic
- [x] dans la note finale, montrer les points par topic
- [x] Traduire la note sur 20
- [x] generer un QR code pour le message (ex json ou texte) de la note
- [x] Le chrono d'une question commence uniquement à partir du moment où la question est affichée à l'écran, pas avant
- [x] Afficher la version du quiz et sa date release

## Next releases - backlog
- [ ] organiser le code en objets, facilement maintenable: proceder de manière progressive
- [ ] optimisation perf, et clean code
- [ ] ajouts tests unitaires
- [ ] ne pas pouvoir commencer un quiz si un autre est encours
- [ ] Reprendre en cas de refresh pour éviter les triches ou les pb navigateurs : enregistrement dans le stockage local du navigateur
- [ ] pouvoir gerer des fichiers (url) de type csv (le json doit rester le format final, après transformation de tout autre format): donc étape csvReader -> csvToJson
- [ ] controle des accès : vérifier les infos, "user/code/quiz"  : s'elle correspondent à une entreé en bdd, alors accepter. sinon réfuser. aussi vérifier si les dates (optionnelles) "debut/fin" du quiz "user/code/quiz" pour afficher un message du style : le quiz ne peut pas commencer avant "debut", ou quiz expirée depuis "fin"
- [ ] pouvoir avoir des niveaux de config propores à chaque question ou groupe de questions: à définir. ex "commonGroupText", "override:{shuffleQuestions:true,xxx:yy}"
- [ ] Ne pas avoir à saisir le nom, code et quiz si les infos sont données dans l'url (query params) => utile??
- [ ] script de minification du js, et obstrucation
- [ ] ping a des periodes aléatoirs pour envoyer des stats à un serveur : pour connaitre qui utlise le quiz
- [ ] avoir un fichier appconfig.json pour définir les parametres par défaut comme:
    - timezone par defaut : Europe/Paris
    - quiz baseUrl