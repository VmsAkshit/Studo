// config.js

// 1. Firebase Configuration (JaycMun Database)
const firebaseConfig = {
    apiKey: "AIzaSyCJivdJTeZ2VnDw50Q2ZL3u4AiUj89Nols",
    authDomain: "smartquiz-f3264.firebaseapp.com",
    projectId: "smartquiz-f3264",
    storageBucket: "smartquiz-f3264.firebasestorage.app",
    messagingSenderId: "657819908694",
    appId: "1:657819908694:web:ca5bc42a9cf7b142e499f7"
};

const geminiKeyPart1 = "AIzaSyCJ2r-OcNecYSwFUi"; 

// 4. Paste the SECOND half below:
const geminiKeyPart2 = "kS4Il5SZKvMWJYOaM"; 

const aiConfig = {
    // This joins the key back together automatically:
    apiKey: geminiKeyPart1 + geminiKeyPart2,
    model: "gemini-3-flash-preview" 
};
