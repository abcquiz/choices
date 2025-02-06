// Configuration globale
const dataBaseUrl = 'https://raw.githubusercontent.com/abcquiz/choices/refs/heads/main/src/examples';
const usercodes = ['test', 'CODE123', 'ADMIN456', 'TEST789']; // Codes d'accès autorisés

let quizConfig = null;
let questions = null;
let currentGroupIndex = 0;
let questionGroups = [];
let userAnswers = {};
let quizTimer = null;
let questionTimer = null;
let totalQuestionCount = 0;

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
    let timeLeft = quizConfig.duration;

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        $('#timer').text(`${minutes}:${seconds.toString().padStart(2, '0')}`);

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
    let timeLeft = duration;

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        $(`#questionTimer${globalIndex}`).text(`${minutes}:${seconds.toString().padStart(2, '0')}`);

        if (timeLeft === 0) {
            clearInterval(questionTimer);
            $(`input[name="question${globalIndex}"]`).prop('disabled', true);
        }
        timeLeft--;
    }

    updateTimer();
    questionTimer = setInterval(updateTimer, 1000);
}

// Navigation entre les groupes de questions
function showPreviousQuestion() {
    if (currentGroupIndex > 0) {
        currentGroupIndex--;
        displayCurrentQuestionGroup();
        updateProgress();
    }
}

function showNextQuestion() {
    if (currentGroupIndex < questionGroups.length - 1) {
        currentGroupIndex++;
        displayCurrentQuestionGroup();
        updateProgress();
    }
}

// Soumission du quiz
function submitQuiz() {
    clearInterval(quizTimer);
    if (questionTimer) clearInterval(questionTimer);

    let totalScore = 0;
    const detailedResults = [];
    let globalQuestionIndex = 0;

    questionGroups.forEach(group => {
        group.forEach(question => {
            const selectedAnswers = $(`input[name="question${globalQuestionIndex}"]:checked`).map(function () {
                return parseInt($(this).val());
            }).get();

            const score = calculateQuestionScore(question, selectedAnswers);
            totalScore += score;

            if (quizConfig.showAnswers) {
                detailedResults.push({
                    question: question.content.text,
                    score: score,
                    correctAnswers: question.choices.filter(choice => choice.correct).map(choice => choice.text),
                    selectedAnswers: selectedAnswers.map(idx => question.choices[idx].text)
                });
            }

            globalQuestionIndex++;
        });
    });

    displayResults(totalScore, detailedResults);
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
function displayResults(totalScore, detailedResults) {
    $('#quizContainer').hide();
    $('#resultsContainer').show();

    const finalScore = (totalScore / totalQuestionCount * 100).toFixed(2);
    $('#finalScore').text(finalScore);

    if (quizConfig.showAnswers) {
        const detailedHtml = detailedResults.map(result => `
            <div class="card mb-3">
                <div class="card-body">
                    <h6 class="card-title">${result.question}</h6>
                    <p>Score: ${(result.score * 100).toFixed(2)}%</p>
                    <p>Réponses correctes: ${result.correctAnswers.join(', ')}</p>
                    <p>Vos réponses: ${result.selectedAnswers.length > 0 ? result.selectedAnswers.join(', ') : 'Aucune réponse'}</p>
                </div>
            </div>
        `).join('');

        $('#detailedResults').html(detailedHtml);
    }
}