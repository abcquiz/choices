const questions = [
    {
        "groupId": "histoire",
        "content": {
            "type": "text",
            "text": "Qui était le premier empereur romain?",
            "url": null
        },
        "choices": [
            { "text": "Jules César", "correct": false },
            { "text": "Auguste", "correct": true },
            { "text": "Néron", "correct": false },
            { "text": "Constantin", "correct": false }
        ],
        "timer": 60
    },
    {
        "groupId": "histoire",
        "content": {
            "type": "video",
            "text": "Regardez cette vidéo sur la construction du Colisée et répondez à la question : Quelle était la principale fonction du Colisée?",
            "url": "https://www.youtube.com/embed/dY4YDLBDHxw"
        },
        "choices": [
            { "text": "Un marché public", "correct": false },
            { "text": "Un lieu de spectacles et de combats", "correct": true },
            { "text": "Un temple religieux", "correct": false }
        ],
        "timer": 180
    },
    {
        "groupId": "sciences",
        "content": {
            "type": "video",
            "text": "Après avoir regardé cette vidéo sur les gaz nobles, sélectionnez les affirmations correctes :",
            "url": "https://www.youtube.com/embed/wz0n43A4i34"
        },
        "choices": [
            { "text": "Les gaz nobles sont chimiquement inertes", "correct": true },
            { "text": "Ils ont leur couche externe d'électrons complète", "correct": true },
            { "text": "Ils peuvent facilement former des liaisons", "correct": false },
            { "text": "Le néon est utilisé dans les enseignes lumineuses", "correct": true }
        ]
    },
    {
        "groupId": null,
        "content": {
            "type": "video",
            "text": "Cette vidéo explique la photosynthèse. Quels éléments sont nécessaires à la photosynthèse?",
            "url": "https://www.youtube.com/embed/sQK3Yr4Sc_k"
        },
        "choices": [
            { "text": "Lumière du soleil", "correct": true },
            { "text": "Dioxyde de carbone", "correct": true },
            { "text": "Azote", "correct": false },
            { "text": "Eau", "correct": true }
        ],
        "timer": 120
    },
    {
        "groupId": "musique",
        "content": {
            "type": "video",
            "text": "Écoutez cet extrait de la Symphonie n°40 et identifiez le compositeur:",
            "url": "https://www.youtube.com/embed/JTc1mDieQI8"
        },
        "choices": [
            { "text": "Mozart", "correct": true },
            { "text": "Beethoven", "correct": false },
            { "text": "Bach", "correct": false }
        ],
        "timer": 90
    },
    {
        "groupId": "geographie",
        "content": {
            "type": "image",
            "text": "Identifiez ce monument célèbre :",
            "url": "https:/api.example.com/placeholder/800/600"
        },
        "choices": [
            { "text": "La Tour Eiffel", "correct": true },
            { "text": "L'Empire State Building", "correct": false },
            { "text": "La Tour de Pise", "correct": false },
            { "text": "Le Burj Khalifa", "correct": false }
        ]
    },
    {
        "groupId": "arts",
        "content": {
            "type": "video",
            "text": "Après avoir regardé cette vidéo sur La Joconde, sélectionnez les affirmations correctes :",
            "url": "https://www.youtube.com/embed/N-OnGSyX2GE"
        },
        "choices": [
            { "text": "Elle a été peinte par Léonard de Vinci", "correct": true },
            { "text": "Elle est exposée au Louvre", "correct": true },
            { "text": "Elle a été peinte sur toile", "correct": false },
            { "text": "Elle date du XVIe siècle", "correct": true }
        ]
    }
];