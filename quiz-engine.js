// --- PASTE THIS AT THE BOTTOM OF quiz-engine.js ---

// Helper: Save single mistake to Cloud
async function saveToMistakeNotebook(question, correctAnswer, explanation, topic) {
    // Safety: Get user directly from Firebase
    const user = firebase.auth().currentUser;
    if (!user) return; 

    try {
        await firebase.firestore().collection('students').doc(user.uid).collection('mistakes').add({
            question: question,
            answer: correctAnswer,
            explanation: explanation,
            topic: topic,
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Mistake saved!");
    } catch (error) {
        console.error("Error saving mistake:", error);
    }
}

// Main Function: Calculate & Save
async function calculateResults() {
    // 1. Check if User is Logged In
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Error: You are not logged in. Results cannot be saved.");
        return;
    }

    quizScore = 0;
    const topic = document.getElementById('q-topic').value;

    // 2. Grade the Quiz
    currentQuestions.forEach((q, index) => {
        const userChoice = userAnswers[index];
        const correctChoice = q.correctIndex;
        const buttons = document.getElementById(`opts-${index}`).getElementsByClassName('option-btn');

        // Show Explanation
        document.getElementById(`explain-${index}`).style.display = 'block';

        // Mark Correct Answer Green
        if(buttons[correctChoice]) buttons[correctChoice].classList.add('correct');

        if (userChoice === correctChoice) {
            quizScore++;
        } else {
            // Mark Wrong Answer Red
            if (userChoice !== undefined) buttons[userChoice].classList.add('wrong');
            
            // SAVE MISTAKE TO CLOUD
            saveToMistakeNotebook(q.question, q.options[correctChoice], q.explanation, topic);
        }
    });

    // 3. Save History to Cloud
    try {
        await firebase.firestore().collection('students').doc(user.uid).collection('history').add({
            topic: topic,
            score: quizScore,
            total: currentQuestions.length,
            date: new Date().toLocaleDateString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("History saved!");
    } catch (error) {
        console.error("Error saving history:", error);
        alert("Could not save progress to cloud.");
    }

    // 4. Show Results Screen
    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('score-display').innerText = `${quizScore} / ${currentQuestions.length}`;
    document.getElementById('feedback-msg').innerText = "Results saved to your Cloud Profile!";
}
