// quiz-engine.js

let currentQuestions = [];
let userAnswers = {};
let quizScore = 0;

// 1. Generate Quiz Function
async function generateQuiz() {
    const subject = document.getElementById('q-subject').value;
    const topic = document.getElementById('q-topic').value;
    const count = document.getElementById('q-count').value;
    const difficulty = document.getElementById('q-diff').value;

    if(!topic) { alert("Please enter a topic name!"); return; }

    // UI Updates
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    // Construct the AI Prompt
    const prompt = `
        Act as a strict CBSE Class 10 teacher. Generate ${count} multiple-choice questions (MCQs) for the subject "${subject}" on the specific topic "${topic}". 
        Difficulty level: ${difficulty}.
        
        Return the response ONLY as a raw JSON array.
        The JSON structure for each object must be:
        [
            {
                "question": "Question text?",
                "options": ["A", "B", "C", "D"],
                "correctIndex": 0,
                "explanation": "Why this is correct."
            }
        ]
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("AI returned no results.");
        }

        // Parse Response
        let aiText = data.candidates[0].content.parts[0].text;
        const jsonStartIndex = aiText.indexOf('[');
        const jsonEndIndex = aiText.lastIndexOf(']') + 1;
        
        if (jsonStartIndex === -1) throw new Error("Invalid JSON from AI");
        
        currentQuestions = JSON.parse(aiText.substring(jsonStartIndex, jsonEndIndex));
        renderQuiz();

    } catch (error) {
        console.error("Quiz Error:", error);
        alert(`Error: ${error.message}`);
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('setup-panel').style.display = 'block';
    }
}

// 2. Render Questions
function renderQuiz() {
    document.getElementById('loading-spinner').style.display = 'none';
    const container = document.getElementById('quiz-panel');
    container.innerHTML = '';
    container.style.display = 'block';

    currentQuestions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.style.display = 'block'; 
        
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

// 3. Handle User Selection
function selectAnswer(qIndex, optIndex, btnElement) {
    userAnswers[qIndex] = optIndex;
    const parent = document.getElementById(`opts-${qIndex}`);
    const buttons = parent.getElementsByClassName('option-btn');
    for(let btn of buttons) btn.classList.remove('selected');
    btnElement.classList.add('selected');
}

// ------------------------------------------------------------
// CLOUD SAVING LOGIC STARTS HERE
// ------------------------------------------------------------

// Helper: Save single mistake to Cloud
async function saveToMistakeNotebook(question, correctAnswer, explanation, topic) {
    const user = window.auth.currentUser;
    if (!user) return; 

    try {
        await window.db.collection('students').doc(user.uid).collection('mistakes').add({
            question: question,
            answer: correctAnswer,
            explanation: explanation,
            topic: topic,
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Mistake saved to Cloud!");
    } catch (error) {
        console.error("Error saving mistake:", error);
    }
}

// 4. Calculate Results & Save to Cloud
async function calculateResults() {
    quizScore = 0;
    const topic = document.getElementById('q-topic').value;
    const user = window.auth.currentUser;

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
            // Save Mistake to Cloud
            saveToMistakeNotebook(q.question, q.options[correctChoice], q.explanation, topic);
        }
    });

    // Save History to Cloud
    if (user) {
        try {
            await window.db.collection('students').doc(user.uid).collection('history').add({
                topic: topic,
                score: quizScore,
                total: currentQuestions.length,
                date: new Date().toLocaleDateString(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("History saved to Cloud!");
        } catch (error) {
            console.error("Error saving history:", error);
        }
    }

    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
    document.getElementById('feedback-msg').innerText = "Results saved to your Cloud Profile!";
}
