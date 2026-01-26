// quiz-engine.js

let currentQuestions = [];
let userAnswers = {};
let quizScore = 0;

async function generateQuiz() {
    const subject = document.getElementById('q-subject').value;
    const topic = document.getElementById('q-topic').value;
    const count = document.getElementById('q-count').value;
    const difficulty = document.getElementById('q-diff').value;

    if(!topic) { alert("Please enter a topic name!"); return; }

    // 1. Setup UI
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    // 2. Create Prompt
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
        // 3. Construct URL dynamically from config.js
        // This line automatically uses whatever model you set in config.js
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
        
        console.log("Requesting URL:", url); // This prints to console for debugging

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        // 4. Error Handling
        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("AI returned no results.");
        }

        // 5. Parse Response
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Find JSON array brackets to ignore extra text
        const jsonStartIndex = aiText.indexOf('[');
        const jsonEndIndex = aiText.lastIndexOf(']') + 1;
        
        if (jsonStartIndex === -1) throw new Error("Invalid JSON from AI");
        
        currentQuestions = JSON.parse(aiText.substring(jsonStartIndex, jsonEndIndex));
        renderQuiz();

    } catch (error) {
        console.error("Quiz Error:", error);
        alert(`Error: ${error.message}`);
        
        // Reset UI so user can try again
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('setup-panel').style.display = 'block';
    }
}

// ---------------------------------------------------
// Render and Logic Functions
// ---------------------------------------------------

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

// Add this helper function at the bottom of quiz-engine.js
function saveToMistakeNotebook(question, correctAnswer, explanation, topic) {
    let notebook = JSON.parse(localStorage.getItem('mistakeNotebook')) || [];
    
    // Add new mistake
    notebook.push({
        question: question,
        answer: correctAnswer,
        explanation: explanation,
        topic: topic,
        date: new Date().toLocaleDateString()
    });

    localStorage.setItem('mistakeNotebook', JSON.stringify(notebook));
}

// REPLACE YOUR OLD calculateResults FUNCTION WITH THIS ONE
function calculateResults() {
    quizScore = 0;
    const topic = document.getElementById('q-topic').value;

    currentQuestions.forEach((q, index) => {
        const userChoice = userAnswers[index];
        const correctChoice = q.correctIndex;
        const explanationDiv = document.getElementById(`explain-${index}`);
        const parent = document.getElementById(`opts-${index}`);
        const buttons = parent.getElementsByClassName('option-btn');

        explanationDiv.style.display = 'block';

        if(buttons[correctChoice]) buttons[correctChoice].classList.add('correct');

        if (userChoice === correctChoice) {
            quizScore++;
        } else {
            // IF WRONG: Highlight wrong button AND Save to Notebook
            if (userChoice !== undefined) buttons[userChoice].classList.add('wrong');
            
            // Save this specific mistake
            saveToMistakeNotebook(
                q.question, 
                q.options[correctChoice], 
                q.explanation,
                topic
            );
        }
    });

    // Save Progress (Score)
    let history = JSON.parse(localStorage.getItem('quizHistory')) || [];
    history.push({
        date: new Date().toLocaleDateString(),
        topic: topic,
        score: quizScore,
        total: currentQuestions.length
    });
    localStorage.setItem('quizHistory', JSON.stringify(history));

    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
    document.getElementById('feedback-msg').innerText = "Mistakes have been saved to your Notebook!";
}
