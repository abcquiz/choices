document.addEventListener('DOMContentLoaded', function () {
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

// Ajouter les écouteurs d'événements pour la vérification de la visibilité:14h49
$(document).ready(function () {
    $(window).on('scroll resize', throttle(checkQuestionVisibility, 250));
});

// Configuration globale
const dataBaseUrl = 'https://raw.githubusercontent.com/abcquiz/choices/refs/heads/main/app/data/v2';
const usercodes = ['test', 'CODE123', 'ADMIN456', 'TEST789']; // Codes d'accès autorisés

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
        const configUrl = `${dataBaseUrl}/${quizcode}/config.js`;
        console.log("debug: configUrl=", configUrl);
        const configResponse = await fetch(configUrl);
        const configText = await configResponse.text();
        console.log("debug: config text:\n", configText);
        const configMatch = configText.match(/config\s*=\s*({[\s\S]*});/);
        if (!configMatch) throw new Error("Format de config.js invalide");
        console.log("debug: config match:OK");

        // On nettoie le JSON avant de le parser
        let configJson = configMatch[1]
            .replace(/\/\/.*/g, '') // Supprime les commentaires sur une ligne
            .replace(/\/\*[\s\S]*?\*\//g, '') // Supprime les commentaires multi-lignes
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2": ') // Assure que les clés sont entre guillemets doubles
            .replace(/'/g, '"') // Remplace les guillemets simples par des guillemets doubles
            .replace(/,(\s*[}\]])/g, '$1'); // Supprime les virgules trailing
        console.log("debug: config text after cleaning:", configJson);

        quizConfig = JSON.parse(configJson);
        console.log("debug: config object:\n", quizConfig);
        // Chargement des questions
        const questionsUrl = `${dataBaseUrl}/${quizcode}/questions.js`;
        console.log("debug: questions url:", questionsUrl);
        const questionsResponse = await fetch(questionsUrl);
        const questionsText = await questionsResponse.text();
        console.log("debug: question text:\n", questionsText);
        const questionsMatch = questionsText.match(/questions\s*=\s*(\[[\s\S]*\]);/);
        if (!questionsMatch) throw new Error("Format de questions.js invalide");
        console.log("debug: questions match:OK");

        // Nettoyage amélioré
        let questionsJson = questionsMatch[1]
            .replace(/\/\/.*/g, '')  // Supprime les commentaires sur une ligne
            .replace(/\/\*[\s\S]*?\*\//g, '')  // Supprime les commentaires multi-lignes
            .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')  // Met des guillemets autour des clés d'objet
            .replace(/:\s*'([^']*?)'/g, ':"$1"')  // Convertit les guillemets simples en doubles pour les valeurs
            .replace(/:\s*"([^"]*?)"/g, ':"$1"')  // Normalise les espaces autour des chaînes
            .replace(/,(\s*[}\]])/g, '$1')  // Supprime les virgules trailing
            .replace(/[\n\r\t]/g, '')  // Supprime les sauts de ligne et tabulations
            .replace(/\s+/g, ' ')  // Normalise les espaces multiples
            .replace(/"url":"https:[^"]*(?=\s*})/g, '"url":"https://example.com"') // Corrige les URLs mal formées
            .trim();

        try {
            questions = JSON.parse(questionsJson);
            console.log("debug: question object:\n", questions);
        } catch (e) {
            console.error("Erreur de parsing JSON:", e);
            console.log("Position de l'erreur:", e.position);
            if (e.position) {
                const start = Math.max(0, e.position - 50);
                const end = Math.min(questionsJson.length, e.position + 50);
                console.log("Contexte:", questionsJson.substring(start, end));
            }
        }

        // Organisation des questions en groupes
        organizeQuestionGroups();

        // Initialisation de l'interface
        initializeQuizInterface();

        // Démarrage du chrono global
        startGlobalTimer();
    } catch (error) {
        alert('Erreur lors du chargement du quiz. Veuillez vérifier le code du quiz.');
        console.error(error);
    }
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
function organizeQuestionGroups() {
    questionGroups = [];
    let currentGroup = [];

    questions.forEach(question => {
        if (!question.groupId && currentGroup.length > 0) {
            questionGroups.push(currentGroup);
            currentGroup = [question];
        } else if (!question.groupId) {
            questionGroups.push([question]);
        } else {
            if (currentGroup.length > 0 && currentGroup[0].groupId !== question.groupId) {
                questionGroups.push(currentGroup);
                currentGroup = [question];
            } else {
                currentGroup.push(question);
            }
        }
    });

    if (currentGroup.length > 0) {
        questionGroups.push(currentGroup);
    }

    // Calculer le nombre total de questions
    totalQuestionCount = questionGroups.reduce((sum, group) => sum + group.length, 0);
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
    const currentGroup = questionGroups[currentGroupIndex];
    const container = $('#questionsContainer');
    container.empty();

    // Calculer l'index de base pour ce groupe
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

    let choicesHtml = question.choices.map((choice, choiceIndex) => `
        <div class="form-check">
            <input class="form-check-input" type="${question.choices.length > 1 ? 'checkbox' : 'radio'}"
                   name="question${globalIndex}" value="${choiceIndex}" id="choice${globalIndex}_${choiceIndex}">
            <label class="form-check-label" for="choice${globalIndex}_${choiceIndex}">
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

// Mise à jour des boutons de navigation
function updateNavigationButtons() {
    $('#prevBtn').toggle(currentGroupIndex > 0);
    $('#nextBtn').toggle(currentGroupIndex < questionGroups.length - 1);
    $('#submitBtn').toggle(currentGroupIndex === questionGroups.length - 1);
}

// Mise à jour de la barre de progression
function updateProgress() {
    const progress = ((currentGroupIndex + 1) / questionGroups.length) * 100;
    $('#progressBar').css('width', `${progress}%`);
    $('#progressText').text(`Question ${currentGroupIndex + 1}/${questionGroups.length}`);
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

    saveCurrentAnswers(); // Sauvegarder les réponses de la dernière page

    let totalScore = 0;
    const detailedResults = [];
    const topicScores = {};
    const topicQuestionCounts = {};

    // Parcourir toutes les questions pour calculer les scores
    questionGroups.forEach((group, groupIndex) => {
        group.forEach((question, questionIndex) => {
            const globalIndex = calculateBaseIndex(groupIndex) + questionIndex;
            const selectedAnswers = userAnswers[globalIndex] || [];
            const score = calculateQuestionScore(question, selectedAnswers);

            totalScore += score;

            // Calculer les scores par topic
            if (question.topic) {
                if (!topicScores[question.topic]) {
                    topicScores[question.topic] = 0;
                    topicQuestionCounts[question.topic] = 0;
                }
                topicScores[question.topic] += score;
                topicQuestionCounts[question.topic]++;
            }

            // Ajouter les résultats détaillés
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

    // Calculer les moyennes par topic
    const topicAverages = {};
    for (const topic in topicScores) {
        topicAverages[topic] = (topicScores[topic] / topicQuestionCounts[topic] * 100).toFixed(2);
    }

    // Log pour le débogage
    console.log('Topic scores:', topicScores);
    console.log('Topic counts:', topicQuestionCounts);
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
                                ${result.feedback ? `
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