// quiz-engine.js - CLEAN VERSION

let currentQuestions = [];
let userAnswers = {};
let quizScore = 0;

async function generateQuiz() {
    const subject = document.getElementById('q-subject').value;
    const topic = document.getElementById('q-topic').value;
    const count = document.getElementById('q-count').value;
    const difficulty = document.getElementById('q-diff').value;

    if(!topic) { alert("Please enter a topic name!"); return; }

    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    // STRICT PROMPT
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
        // *** THIS IS THE CRITICAL LINE THAT WAS BROKEN ***
        // quiz-engine.js (Line 40)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        let aiText = data.candidates[0].content.parts[0].text;
        
        // Clean JSON
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

function selectAnswer(qIndex, optIndex, btnElement) {
    userAnswers[qIndex] = optIndex;
    const parent = document.getElementById(`opts-${qIndex}`);
    const buttons = parent.getElementsByClassName('option-btn');
    for(let btn of buttons) btn.classList.remove('selected');
    btnElement.classList.add('selected');
}

function calculateResults() {
    quizScore = 0;
    currentQuestions.forEach((q, index) => {
        const userChoice = userAnswers[index];
        const correctChoice = q.correctIndex;
        const explanation = document.getElementById(`explain-${index}`);
        const parent = document.getElementById(`opts-${index}`);
        const buttons = parent.getElementsByClassName('option-btn');

        explanation.style.display = 'block';
        if(buttons[correctChoice]) buttons[correctChoice].classList.add('correct');
        if (userChoice !== undefined && userChoice !== correctChoice) {
            buttons[userChoice].classList.add('wrong');
        }
        if (userChoice === correctChoice) quizScore++;
    });

    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
}
