// quiz-engine.js - FINAL STABLE VERSION

let currentQuestions = [];
let userAnswers = {};
let quizScore = 0;

// --- 1. GENERATE QUIZ ---
async function generateQuiz() {
    const subject = document.getElementById('q-subject').value;
    const topic = document.getElementById('q-topic').value;
    const count = document.getElementById('q-count').value;
    const difficulty = document.getElementById('q-diff').value;

    if(!topic) { alert("Please enter a topic name!"); return; }

    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    const prompt = `
        Act as a strict CBSE Class 10 teacher. Generate ${count} multiple-choice questions (MCQs) for the subject "${subject}" on the specific topic "${topic}". 
        Difficulty level: ${difficulty}.
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
        const jsonStartIndex = aiText.indexOf('[');
        const jsonEndIndex = aiText.lastIndexOf(']') + 1;
        
        currentQuestions = JSON.parse(aiText.substring(jsonStartIndex, jsonEndIndex));
        renderQuiz();

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        location.reload();
    }
}

// --- 2. RENDER QUIZ ---
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
        card.innerHTML = `<h3>Q${index + 1}: ${q.question}</h3><div id="opts-${index}">${optionsHtml}</div><div id="explain-${index}" class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>`;
        container.appendChild(card);
    });

    const submitBtn = document.createElement('button');
    submitBtn.innerText = "Submit Quiz";
    submitBtn.style.marginTop = "20px";
    submitBtn.onclick = calculateResults; // This triggers the save logic
    container.appendChild(submitBtn);
}

function selectAnswer(qIndex, optIndex, btnElement) {
    userAnswers[qIndex] = optIndex;
    const parent = document.getElementById(`opts-${qIndex}`);
    const buttons = parent.getElementsByClassName('option-btn');
    for(let btn of buttons) btn.classList.remove('selected');
    btnElement.classList.add('selected');
}

// --- 3. CALCULATE AND SAVE (FIXED) ---
async function calculateResults() {
    // SECURITY CHECK: Ensure user is logged in
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("You must be logged in to save results.");
        return;
    }

    quizScore = 0;
    const topic = document.getElementById('q-topic').value;

    // Loop through questions
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
            
            // SAVE MISTAKE TO FIRESTORE
            db.collection('students').doc(user.uid).collection('mistakes').add({
                question: q.question,
                answer: q.options[correctChoice],
                explanation: q.explanation,
                topic: topic,
                date: new Date().toLocaleDateString(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });

    // SAVE HISTORY TO FIRESTORE
    try {
        await db.collection('students').doc(user.uid).collection('history').add({
            topic: topic,
            score: quizScore,
            total: currentQuestions.length,
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("Data Saved Successfully");
        document.getElementById('quiz-panel').style.display = 'none';
        document.getElementById('result-panel').style.display = 'block';
        document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
        document.getElementById('feedback-msg').innerText = "Results saved to Cloud!";

    } catch (error) {
        console.error("Save Error:", error);
        alert("Error saving result: " + error.message);
    }
}
