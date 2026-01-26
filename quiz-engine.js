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
        
        Return the response ONLY as a raw JSON array. Do not wrap in markdown (no \`\`\`json).
        The JSON structure for each object must be exactly:
        [
            {
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctIndex": 0,
                "explanation": "Short explanation why."
            }
        ]
        Make sure correctIndex is 0, 1, 2, or 3.
    `;

    try {
        // Call Google Gemini API
       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiConfig.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No response from AI.");
        }

        // Parse the AI response
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Clean up if AI accidentally adds markdown
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        currentQuestions = JSON.parse(aiText);
        renderQuiz();

    } catch (error) {
        console.error(error);
        alert("Error generating quiz. Please try a different topic or check your API limit.");
        window.location.reload();
    }
}

// 2. Render Questions to Screen
function renderQuiz() {
    document.getElementById('loading-spinner').style.display = 'none';
    const container = document.getElementById('quiz-panel');
    container.innerHTML = '';

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

    // Add Submit Button
    const submitBtn = document.createElement('button');
    submitBtn.innerText = "Submit Quiz";
    submitBtn.style.marginTop = "20px";
    submitBtn.onclick = calculateResults;
    container.appendChild(submitBtn);
}

// 3. Handle User Selection
function selectAnswer(qIndex, optIndex, btnElement) {
    // Save answer
    userAnswers[qIndex] = optIndex;
    
    // UI Highlight
    const parent = document.getElementById(`opts-${qIndex}`);
    const buttons = parent.getElementsByClassName('option-btn');
    for(let btn of buttons) btn.classList.remove('selected');
    btnElement.classList.add('selected');
}

// 4. Calculate Results
function calculateResults() {
    quizScore = 0;
    
    currentQuestions.forEach((q, index) => {
        const userChoice = userAnswers[index];
        const correctChoice = q.correctIndex;
        const explanation = document.getElementById(`explain-${index}`);
        const parent = document.getElementById(`opts-${index}`);
        const buttons = parent.getElementsByClassName('option-btn');

        // Reveal Explanation
        explanation.style.display = 'block';

        // Highlight Correct Answer
        if(buttons[correctChoice]) buttons[correctChoice].classList.add('correct');
        
        // Highlight User's Wrong Answer
        if (userChoice !== undefined && userChoice !== correctChoice) {
            buttons[userChoice].classList.add('wrong');
        }

        if (userChoice === correctChoice) {
            quizScore++;
        }
    });

    // Hide Quiz Panel, Show Results
    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
}
