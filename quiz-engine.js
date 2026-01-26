// quiz-engine.js - CLEAN VERSION

console.log("Quiz Engine Script Loaded Successfully");

// Global Variables
let currentQuestions = [];
let userAnswers = {};
let quizScore = 0;

// --- 1. GENERATE QUIZ FUNCTION ---
async function generateQuiz() {
    console.log("Generate button clicked!");

    // Check if Config is loaded
    if (typeof aiConfig === 'undefined') {
        alert("Critical Error: config.js is not loaded. Check your HTML file.");
        return;
    }

    const subject = document.getElementById('q-subject').value;
    const topic = document.getElementById('q-topic').value;
    const count = document.getElementById('q-count').value;
    const difficulty = document.getElementById('q-diff').value;

    if(!topic) { alert("Please enter a topic!"); return; }

    // UI Updates
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    const prompt = `
        Act as a teacher. Generate ${count} MCQs for Subject: "${subject}", Topic: "${topic}". 
        Difficulty: ${difficulty}.
        Return ONLY a raw JSON array.
        Structure: [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..."}]
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        let aiText = data.candidates[0].content.parts[0].text;
        
        // JSON Cleaning
        const jsonStartIndex = aiText.indexOf('[');
        const jsonEndIndex = aiText.lastIndexOf(']') + 1;
        
        if (jsonStartIndex === -1) throw new Error("AI did not return valid JSON.");
        
        currentQuestions = JSON.parse(aiText.substring(jsonStartIndex, jsonEndIndex));
        renderQuiz();

    } catch (error) {
        console.error("Quiz Generation Error:", error);
        alert("Error: " + error.message);
        // Reset UI
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('setup-panel').style.display = 'block';
    }
}

// --- 2. RENDER FUNCTION ---
function renderQuiz() {
    document.getElementById('loading-spinner').style.display = 'none';
    const container = document.getElementById('quiz-panel');
    container.innerHTML = '';
    container.style.display = 'block';

    currentQuestions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        
        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            optionsHtml += `<button class="option-btn" onclick="selectAnswer(${index}, ${i}, this)">${opt}</button>`;
        });

        card.innerHTML = `
            <h3>Q${index + 1}: ${q.question}</h3>
            <div id="opts-${index}">${optionsHtml}</div>
            <div id="explain-${index}" class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>
        `;
        container.appendChild(card);
    });

    const submitBtn = document.createElement('button');
    submitBtn.innerText = "Submit Quiz";
    submitBtn.style.marginTop = "20px";
    submitBtn.onclick = calculateResults;
    container.appendChild(submitBtn);
}

function selectAnswer(qIndex, optIndex, btnElement) {
    userAnswers[qIndex] = optIndex;
    const parent = document.getElementById(`opts-${qIndex}`);
    const buttons = parent.getElementsByClassName('option-btn');
    for(let btn of buttons) btn.classList.remove('selected');
    btnElement.classList.add('selected');
}

// --- 3. SUBMIT & SAVE FUNCTION ---
async function calculateResults() {
    // Check Login Status
    const user = (typeof firebase !== 'undefined') ? firebase.auth().currentUser : null;

    quizScore = 0;
    const topic = document.getElementById('q-topic').value;

    currentQuestions.forEach((q, index) => {
        const userChoice = userAnswers[index];
        const correctChoice = q.correctIndex;
        const buttons = document.getElementById(`opts-${index}`).getElementsByClassName('option-btn');

        document.getElementById(`explain-${index}`).style.display = 'block';

        if(buttons[correctChoice]) buttons[correctChoice].classList.add('correct');

        if (userChoice === correctChoice) {
            quizScore++;
        } else {
            if (userChoice !== undefined) buttons[userChoice].classList.add('wrong');
            
            // Cloud Save: Mistake
            if(user) {
                db.collection('students').doc(user.uid).collection('mistakes').add({
                    question: q.question,
                    answer: q.options[correctChoice],
                    explanation: q.explanation,
                    topic: topic,
                    date: new Date().toLocaleDateString(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    });

    // Cloud Save: History
    if(user) {
        try {
            await db.collection('students').doc(user.uid).collection('history').add({
                topic: topic,
                score: quizScore,
                total: currentQuestions.length,
                date: new Date().toLocaleDateString(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch(e) { console.error("Save Error", e); }
    }

    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
    
    document.getElementById('feedback-msg').innerText = user 
        ? "Results saved to Cloud!" 
        : "Good practice! (Login to save results)";
}
