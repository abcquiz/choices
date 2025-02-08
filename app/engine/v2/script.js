// Version du quiz à afficher sur la page de login
const QUIZ_VERSION = "2.1.0-2025-02-08 13:23";
document.addEventListener('DOMContentLoaded', function () {
    // Ajout de la version dans le footer du formulaire de login
    const loginForm = document.getElementById('loginForm');
    const versionDiv = document.createElement('div');
    versionDiv.className = 'text-center mt-3 text-muted small';
    versionDiv.innerHTML = `Version ${QUIZ_VERSION}`;
    loginForm.appendChild(versionDiv);

    // Vérifier si nous sommes en local
    const isLocalhost = window.location.hostname === 'localhost';

    // Ne vérifier HTTPS que si nous ne sommes pas en local
    if (!isLocalhost && window.location.protocol !== 'https:') {
        console.warn('Redirection vers HTTPS...');
        window.location.href = 'https://' + window.location.host + window.location.pathname;
        return;
    }

    // Vérifier l'accès au stockage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        console.log('Accès au stockage local confirmé');
    } catch (e) {
        console.error('Erreur d\'accès au stockage local:', e);
        alert('Votre navigateur bloque l\'accès au stockage local. Veuillez vérifier vos paramètres de confidentialité.');
    }
});

document.getElementById('loginForm').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        startQuiz();
    }
});

// Ajouter les écouteurs d'événements pour la vérification de la visibilité:15h13
$(document).ready(function () {
    $(window).on('scroll resize', throttle(checkQuestionVisibility, 250));
});

// Configuration globale
const dataBaseUrl = 'https://raw.githubusercontent.com/abcquiz/choices/refs/heads/main/app/data/v2';
const usercodes = ['','test', 'CODE123', 'ADMIN456', 'TEST789']; // Codes d'accès autorisés

let quizConfig = null;
let questions = null;
let currentGroupIndex = 0;
let questionGroups = [];
let userAnswers = {};
let quizTimer = null;
let questionTimer = null;
let totalQuestionCount = 0;
// Stockage des timers par question
let questionTimers = {};

// Fonction de démarrage du quiz
async function startQuiz() {
    const username = $('#username').val();
    const usercode = $('#usercode').val();
    const quizcode = $('#quizcode').val();

    if (!username || !usercode || !quizcode) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    if (!usercodes.includes(usercode)) {
        alert('Code d\'accès invalide');
        return;
    }

    try {
        // Chargement de la configuration
        const configUrl = `${dataBaseUrl}/${quizcode}/config.json`;
        console.log("debug: configUrl=", configUrl);
        const configResponse = await fetch(configUrl);
        const configText = await configResponse.text();
        console.log("debug: config text:\n", configText);
        //ici on part du principe que le text json fourni est sensé être propre
        try {
            quizConfig = JSON.parse(configText);
            console.log("debug: config object:\n", quizConfig);
        } catch (e) {
            console.error("Erreur parsing config:", e);
            throw new Error("Format de config.js invalide");
        }

        // Vérification des dates de démarrage
        const now = new Date();
        const locale = quizConfig.locale || 'fr-FR'; // Utilise fr-FR par défaut si non spécifié

        // Fonction pour convertir une date de la config dans un fuseau horaire spécifique
        function getDateInTimezone(dateConfig) {
            if (!dateConfig || !dateConfig.datetime || !dateConfig.timezone) return null;
            
            // Créer une date dans le fuseau horaire spécifié
            try {
                return new Date(new Date(dateConfig.datetime).toLocaleString(locale, {
                    timeZone: dateConfig.timezone
                }));
            } catch (e) {
                console.error('Erreur de timezone:', e);
                return null;
            }
        }

        // Si une date de début est définie, vérifier qu'elle n'est pas dans le futur
        if (quizConfig.startDate) {
            const startDate = getDateInTimezone(quizConfig.startDate);
            if (startDate && startDate > now) {
                const formattedDate = startDate.toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: quizConfig.startDate.timezone,
                    timeZoneName: 'short'
                });
                alert(`Le quiz ne peut pas commencer avant le ${formattedDate}`);
                return;
            }
        }

        // Si une date de fin est définie, vérifier qu'elle n'est pas dépassée
        if (quizConfig.endDate) {
            const endDate = getDateInTimezone(quizConfig.endDate);
            if (endDate && endDate < now) {
                const formattedDate = endDate.toLocaleString(locale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: quizConfig.endDate.timezone,
                    timeZoneName: 'short'
                });
                alert(`La date de démarrage du quiz est expirée depuis le ${formattedDate}`);
                return;
            }
        }

        // Chargement des questions
        const questionsUrl = `${dataBaseUrl}/${quizcode}/questions.json`;
        console.log("debug: questions url:", questionsUrl);
        const questionsResponse = await fetch(questionsUrl);
        const questionsText = await questionsResponse.text();
        console.log("debug: question text:\n", questionsText);

        try {
            //questionsText est sensé être propre
            questions = JSON.parse(questionsText);
            console.log("debug: question object:\n", questions);
        } catch (e) {
            console.error("Erreur de parsing JSON:", e);
            console.log("Position de l'erreur:", e.position);
        }

        // Organisation des questions en groupes
        organizeQuestionGroups(quizConfig.shuffleQuestionGroups,quizConfig.shuffleQuestions);

        // Initialisation de l'interface
        initializeQuizInterface();

        // Démarrage du chrono global
        startGlobalTimer();
    } catch (error) {
        alert('Erreur lors du chargement du quiz. Veuillez vérifier le code du quiz.');
        console.error(error);
    }

    // try {
    //     // Après le chargement des questions
    //     console.log("Questions chargées:", questions);

    //     // Organisation des questions en groupes
    //     organizeQuestionGroups();
    //     console.log("Groupes organisés:", questionGroups);

    //     // Initialisation de l'interface
    //     initializeQuizInterface();
    // } catch (error) {
    //     alert('Erreur lors du chargement du quiz. Veuillez vérifier le code du quiz.');
    //     console.error(error);
    // }
}
// Fonction simple de throttle
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Fonction pour formater le temps restant
function formatTimeRemaining(seconds) {
    if (seconds < 0) return "0s";

    const hours = Math.floor(seconds / 3600);
    seconds = seconds % 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    let timeString = '';

    if (hours > 0) {
        timeString += `${hours}h `;
    }
    if (minutes > 0 || hours > 0) {
        timeString += `${minutes.toString().padStart(2, '0')}m `;
    }
    timeString += `${seconds.toString().padStart(2, '0')}s`;

    return timeString;
}

// Organisation des questions en groupes
function organizeQuestionGroups(shuffleQuestionGroups,shuffleQuestions) {
    // Utiliser un Map pour regrouper les questions
    const groupMap = new Map();

    // Utiliser l'index dans la boucle pour générer un id unique si nécessaire
    questions.forEach((question, index) => {
        const groupId = question.groupId || `single_${index}`;
        if (!groupMap.has(groupId)) {
            groupMap.set(groupId, []);
        }
        groupMap.get(groupId).push(question);
    });

    // Récupérer les groupes sous forme de tableau
    let groupedQuestions = Array.from(groupMap.values());

    // Si le paramètre shuffleQuestions est true, mélanger l'ordre des questions dans chaque groupe
    if (shuffleQuestions) {
        groupedQuestions = groupedQuestions.map(group => shuffleArray(group));
    }

    // Si le paramètre shuffleQuestionGroups est true, mélanger l'ordre des groupes
    if (shuffleQuestionGroups) {
        groupedQuestions = shuffleArray(groupedQuestions);
    }

    // Mettre à jour les variables globales (ou les variables concernées)
    questionGroups = groupedQuestions;

    // Calculer le nombre total de questions
    totalQuestionCount = questions.length;

    console.log("Questions regroupées:", questionGroups);
}

// Initialisation de l'interface du quiz
function initializeQuizInterface() {
    $('#loginForm').hide();
    $('#quizContainer').show();
    $('#quizTitle').text(quizConfig.title);

    displayCurrentQuestionGroup();
    updateProgress();
}

// Calcul de l'index de base pour un groupe
function calculateBaseIndex(groupIndex) {
    let baseIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
        baseIndex += questionGroups[i].length;
    }
    return baseIndex;
}

// Calcul des scores par topic
function calculateTopicScores(questionGroups, userAnswers) {
    const topicScores = {};
    const topicQuestionCounts = {};

    questionGroups.forEach((group, groupIndex) => {
        group.forEach((question, questionIndex) => {
            const globalIndex = calculateBaseIndex(groupIndex) + questionIndex;
            const selectedAnswers = userAnswers[globalIndex] || [];
            const score = calculateQuestionScore(question, selectedAnswers);

            // Si la question a un topic, calculer le score pour ce topic
            if (question.topic) {
                if (!topicScores[question.topic]) {
                    topicScores[question.topic] = 0;
                    topicQuestionCounts[question.topic] = 0;
                }
                topicScores[question.topic] += score;
                topicQuestionCounts[question.topic]++;
            }
        });
    });

    // Calculer les moyennes par topic
    const topicAverages = {};
    for (const topic in topicScores) {
        topicAverages[topic] = (topicScores[topic] / topicQuestionCounts[topic] * 100).toFixed(2);
    }

    return topicAverages;
}

// Affichage du groupe de questions actuel
function displayCurrentQuestionGroup() {
    console.log("Affichage du groupe:", currentGroupIndex);
    console.log("Groupe actuel:", questionGroups[currentGroupIndex]);

    const currentGroup = questionGroups[currentGroupIndex];
    const container = $('#questionsContainer');
    container.empty();

    // Nettoyer les anciens timers
    if (questionTimers) {
        Object.values(questionTimers).forEach(timer => {
            if (timer.interval) {
                clearInterval(timer.interval);
            }
        });
    }
    questionTimers = {};

    // Si le groupe est valide
    if (currentGroup && Array.isArray(currentGroup)) {
        const baseIndex = calculateBaseIndex(currentGroupIndex);
        console.log("Base index pour ce groupe:", baseIndex);

        currentGroup.forEach((question, groupQuestionIndex) => {
            const globalIndex = baseIndex + groupQuestionIndex;
            console.log("Création question:", globalIndex, question);

            const questionHtml = createQuestionHtml(question, globalIndex);
            container.append(questionHtml);

            if (question.timer) {
                startQuestionTimer(question.timer, globalIndex);
            }
        });
    } else {
        console.error("Groupe invalide:", currentGroup);
    }

    updateNavigationButtons();
    setTimeout(checkQuestionVisibility, 100);
}

// Création du HTML pour une question
function createQuestionHtml(question, globalIndex) {
    let mediaHtml = '';
    if (question.content.type === 'image') {
        mediaHtml = `<img src="${question.content.url}" alt="Question media" class="media-content">`;
    } else if (question.content.type === 'video') {
        mediaHtml = `<iframe width="560" height="315" src="${question.content.url}" frameborder="0" allowfullscreen class="media-content"></iframe>`;
    } else if (question.content.type === 'audio') {
        mediaHtml = `<audio controls src="${question.content.url}" class="media-content"></audio>`;
    }

    // Préparation des choix avec leurs indices pour le shuffle
    let choices = question.choices.map((choice, idx) => ({
        ...choice,
        originalIndex: idx // Garder l'index original pour la valeur
    }));

    // Mélanger les choix si l'option est activée
    if (quizConfig.shuffleChoices) {
        choices = shuffleArray(choices);
    }

    let choicesHtml = choices.map(choice => `
        <div class="form-check">
            <input class="form-check-input" 
                   type="${question.choices.length > 1 ? 'checkbox' : 'radio'}"
                   name="question${globalIndex}" 
                   value="${choice.originalIndex}" 
                   id="choice${globalIndex}_${choice.originalIndex}">
            <label class="form-check-label" for="choice${globalIndex}_${choice.originalIndex}">
                ${choice.text}
            </label>
        </div>
    `).join('');

    return `
        <div class="card mb-4 question" data-question-index="${globalIndex}">
            <div class="card-body">
                <h5 class="card-title">Question ${globalIndex + 1}</h5>
                <p class="card-text">${question.content.text}</p>
                ${mediaHtml}
                <div class="choices mt-3">
                    ${choicesHtml}
                </div>
                ${question.timer ? `<div class="question-timer mt-2">Temps restant: <span id="questionTimer${globalIndex}">--:--</span></div>` : ''}
            </div>
        </div>
    `;
}

// Fonction utilitaire pour mélanger un tableau
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Mise à jour des boutons de navigation
function updateNavigationButtons() {
    // Affiche le bouton "Précédent" uniquement si :
    // 1. showPreviousButton est activé dans la config (false) ou n'est pas défini (false)
    // 2. On n'est pas sur le premier groupe de questions
    const showPreviousButton = quizConfig && quizConfig.showPreviousButton === true;
    $('#prevBtn').toggle(showPreviousButton && currentGroupIndex > 0);
    $('#nextBtn').toggle(currentGroupIndex < questionGroups.length - 1);
    $('#submitBtn').toggle(currentGroupIndex === questionGroups.length - 1);
}

// Mise à jour de la barre de progression
function updateProgress() {
    console.log("Mise à jour progression:", currentGroupIndex + 1, "sur", questionGroups.length);
    const progress = ((currentGroupIndex + 1) / questionGroups.length) * 100;
    $('#progressBar').css('width', `${progress}%`);
    $('#progressText').text(`Page ${currentGroupIndex + 1}/${questionGroups.length}`);
}

// Démarrage du chrono global
function startGlobalTimer() {
    let timeLeft = quizConfig.duration; // La durée est déjà en secondes dans le fichier config

    function updateTimer() {
        const formattedTime = formatTimeRemaining(timeLeft);
        $('#timer').text(formattedTime);

        if (timeLeft === 0) {
            clearInterval(quizTimer);
            submitQuiz();
        }
        timeLeft--;
    }

    updateTimer();
    quizTimer = setInterval(updateTimer, 1000);
}

// Démarrage du chrono pour une question
function startQuestionTimer(duration, globalIndex) {
    // Si un timer existe déjà pour cette question, on le nettoie
    if (questionTimers[globalIndex]) {
        clearInterval(questionTimers[globalIndex].interval);
    }

    let timeLeft = duration;
    const timerElement = $(`#questionTimer${globalIndex}`);

    // Créer l'objet timer pour cette question
    questionTimers[globalIndex] = {
        duration: duration,
        timeLeft: timeLeft,
        started: false,
        interval: null
    };

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.text(`${minutes}:${seconds.toString().padStart(2, '0')}`);

        if (timeLeft === 0) {
            clearInterval(questionTimers[globalIndex].interval);
            $(`input[name="question${globalIndex}"]`).prop('disabled', true);
        }
        timeLeft--;
    }

    // On initialise l'affichage sans démarrer le timer
    updateTimer();
}

// Fonction pour vérifier la visibilité et démarrer les timers si nécessaire
function checkQuestionVisibility() {
    const windowHeight = $(window).height();
    const scrollTop = $(window).scrollTop();

    $('.question').each(function () {
        const questionElement = $(this);
        const questionIndex = questionElement.data('question-index');
        const questionTimer = questionTimers[questionIndex];

        // Vérifier si la question a un timer configuré mais pas encore démarré
        if (questionTimer && !questionTimer.started) {
            const elementTop = questionElement.offset().top;
            const elementBottom = elementTop + questionElement.height();

            // Vérifier si l'élément est visible dans la fenêtre
            if (elementTop < (scrollTop + windowHeight) && elementBottom > scrollTop) {
                // Démarrer le timer
                questionTimer.started = true;
                questionTimer.interval = setInterval(() => {
                    if (questionTimer.timeLeft > 0) {
                        questionTimer.timeLeft--;
                        const minutes = Math.floor(questionTimer.timeLeft / 60);
                        const seconds = questionTimer.timeLeft % 60;
                        $(`#questionTimer${questionIndex}`).text(
                            `${minutes}:${seconds.toString().padStart(2, '0')}`
                        );

                        if (questionTimer.timeLeft === 0) {
                            clearInterval(questionTimer.interval);
                            $(`input[name="question${questionIndex}"]`).prop('disabled', true);
                        }
                    }
                }, 1000);
            }
        }
    });
}

// Modification de la fonction displayCurrentQuestionGroup
function displayCurrentQuestionGroup() {
    const currentGroup = questionGroups[currentGroupIndex];
    const container = $('#questionsContainer');
    container.empty();

    // Nettoyer les anciens timers
    questionTimers = {};

    const baseIndex = calculateBaseIndex(currentGroupIndex);

    currentGroup.forEach((question, groupQuestionIndex) => {
        const globalIndex = baseIndex + groupQuestionIndex;
        const questionHtml = createQuestionHtml(question, globalIndex);
        container.append(questionHtml);

        if (question.timer) {
            startQuestionTimer(question.timer, globalIndex);
        }
    });

    updateNavigationButtons();

    // Vérifier la visibilité des questions après leur affichage
    setTimeout(checkQuestionVisibility, 100);
}

function showNextQuestion() {
    saveCurrentAnswers();
    if (currentGroupIndex < questionGroups.length - 1) {
        currentGroupIndex++;
        displayCurrentQuestionGroup();
        loadSavedAnswers();
        updateProgress();
    }
}

function saveCurrentAnswers() {
    const currentGroup = questionGroups[currentGroupIndex];
    const baseIndex = calculateBaseIndex(currentGroupIndex);

    currentGroup.forEach((question, questionIndex) => {
        const globalIndex = baseIndex + questionIndex;
        const answers = $(`input[name="question${globalIndex}"]:checked`).map(function () {
            return parseInt($(this).val());
        }).get();
        userAnswers[globalIndex] = answers;
    });
}

function loadSavedAnswers() {
    const currentGroup = questionGroups[currentGroupIndex];
    const baseIndex = calculateBaseIndex(currentGroupIndex);

    currentGroup.forEach((question, questionIndex) => {
        const globalIndex = baseIndex + questionIndex;
        const savedAnswers = userAnswers[globalIndex] || [];
        savedAnswers.forEach(answer => {
            $(`#choice${globalIndex}_${answer}`).prop('checked', true);
        });
    });
}

// Soumission du quiz
function submitQuiz() {
    clearInterval(quizTimer);
    if (questionTimer) clearInterval(questionTimer);

    saveCurrentAnswers();

    let totalScore = 0;
    const detailedResults = [];

    // Réinitialisation des structures pour les scores par topic
    const topicScores = new Map();       // Somme des scores par topic
    const topicQuestionCounts = new Map(); // Nombre de questions par topic

    // Premier passage : calcul des scores et comptage
    questionGroups.forEach((group, groupIndex) => {
        group.forEach((question, questionIndex) => {
            const globalIndex = calculateBaseIndex(groupIndex) + questionIndex;
            const selectedAnswers = userAnswers[globalIndex] || [];
            const score = calculateQuestionScore(question, selectedAnswers);

            totalScore += score;

            // Si la question a un topic, on accumule son score
            if (question.topic) {
                // Mise à jour du score total pour ce topic
                topicScores.set(
                    question.topic,
                    (topicScores.get(question.topic) || 0) + score
                );

                // Mise à jour du compte de questions pour ce topic
                topicQuestionCounts.set(
                    question.topic,
                    (topicQuestionCounts.get(question.topic) || 0) + 1
                );
            }

            detailedResults.push({
                question: question.content.text,
                score: score,
                correctAnswers: question.choices.filter(choice => choice.correct).map(choice => choice.text),
                selectedAnswers: selectedAnswers.map(idx => question.choices[idx].text),
                feedback: question.feedback,
                topic: question.topic
            });
        });
    });

    // Deuxième passage : calcul des moyennes par topic
    const topicAverages = {};
    topicScores.forEach((totalScore, topic) => {
        const questionCount = topicQuestionCounts.get(topic);
        if (questionCount > 0) {
            // Calcul du pourcentage sur 100 pour ce topic
            const averageScore = (totalScore / questionCount) * 100;
            topicAverages[topic] = Number(averageScore.toFixed(2));
        }
    });

    // Log de debug pour vérifier les calculs
    console.log('Topic question counts:', Object.fromEntries(topicQuestionCounts));
    console.log('Topic total scores:', Object.fromEntries(topicScores));
    console.log('Topic averages:', topicAverages);

    displayResults(totalScore, detailedResults, topicAverages);
}

// Calcul du score pour une question
function calculateQuestionScore(question, selectedAnswers) {
    const correctAnswers = question.choices.map((choice, index) => ({ index, correct: choice.correct }))
        .filter(choice => choice.correct)
        .map(choice => choice.index);

    const n = correctAnswers.length;
    let score = 0;

    selectedAnswers.forEach(answer => {
        if (correctAnswers.includes(answer)) {
            score += 1 / n;
        } else {
            score -= 1 / n;
        }
    });

    return Math.max(0, Math.min(1, score));
}

// Affichage des résultats
function displayResults(totalScore, detailedResults, topicAverages) {
    $('#quizContainer').hide();
    $('#resultsContainer').show();

    // Calcul des scores
    const scoreOn100 = (totalScore / totalQuestionCount * 100).toFixed(2);
    const scoreOn20 = (scoreOn100 * 20 / 100).toFixed(2);

    // Récupération des informations du quiz
    const username = $('#username').val();
    const quizTitle = quizConfig.title;
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Création de l'objet de données pour le QR Code
    const qrData = {
        username: username,
        quizTitle: quizTitle,
        date: currentDate,
        scoreOn100: scoreOn100,
        scoreOn20: scoreOn20,
        topicScores: topicAverages
    };

    // Encodage des données pour le QR Code
    const qrCodeData = encodeURIComponent(JSON.stringify(qrData));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrCodeData}`;

    // Construction du HTML des résultats
    let resultsHtml = `
        <h2 class="text-center mb-4">Résultats</h2>
        <div class="card mb-4">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="mb-3">
                            <strong>Nom :</strong> ${username}
                        </div>
                        <div class="mb-3">
                            <strong>Quiz :</strong> ${quizTitle}
                        </div>
                        <div class="mb-3">
                            <strong>Date :</strong> ${currentDate}
                        </div>
                        <div class="mb-3">
                            <strong>Note :</strong> 
                            <ul class="list-unstyled">
                                <li>Sur 100 : ${scoreOn100}/100</li>
                                <li>Sur 20 : ${scoreOn20}/20</li>
                            </ul>
                        </div>
                    </div>
                    <div class="col-md-4 text-center">
                        <img src="${qrCodeUrl}" alt="QR Code des résultats" class="img-fluid">
                        <div class="mt-2 small text-muted">Scanner pour voir les détails</div>
                    </div>
                </div>
            </div>
        </div>`;

    // Ajout des scores par topic
    if (Object.keys(topicAverages).length > 0) {
        resultsHtml += `
            <div class="card mb-4">
                <div class="card-body">
                    <h4>Scores par thème</h4>
                    <div class="topic-scores mt-3">`;

        for (const [topic, score] of Object.entries(topicAverages)) {
            const topicScoreOn20 = (parseFloat(score) * 20 / 100).toFixed(2);
            resultsHtml += `
                <div class="topic-score mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <strong>${topic}</strong>
                        <span>${score}% (${topicScoreOn20}/20)</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" 
                             role="progressbar" 
                             style="width: ${score}%"
                             aria-valuenow="${score}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${score}%
                        </div>
                    </div>
                </div>`;
        }

        resultsHtml += `
                    </div>
                </div>
            </div>`;
    }

    // Ajout des résultats détaillés
    if (quizConfig.showAnswers) {
        resultsHtml += `
            <div class="card mb-4">
                <div class="card-body">
                    <h4>Détail des réponses</h4>
                    ${detailedResults.map(result => `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5>${result.question}</h5>
                                ${result.topic ? `<div class="text-muted mb-2">Thème: ${result.topic}</div>` : ''}
                                <p>Score: ${(result.score * 100).toFixed(2)}% (${(result.score * 20).toFixed(2)}/20)</p>
                                <p>Réponses correctes: ${result.correctAnswers.join(', ')}</p>
                                <p>Vos réponses: ${result.selectedAnswers.length > 0 ? result.selectedAnswers.join(', ') : 'Aucune réponse'}</p>
                                ${(quizConfig.showFeedbackAfterEachQuestion && result.feedback) ? `
                                    <div class="feedback mt-3">
                                        <strong>Feedback:</strong> ${result.feedback}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    // Mise à jour du conteneur de résultats
    $('#resultsContainer').html(resultsHtml);
}