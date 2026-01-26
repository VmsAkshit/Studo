// auth.js

// Initialize Firebase using the config from config.js
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 1. Toggle between Login and Register views
function toggleAuth(view) {
    if (view === 'register') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    } else {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
    }
}

// 2. Register User
function registerUser() {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const name = document.getElementById('reg-name').value;
    const studentClass = document.getElementById('reg-class').value;

    if(!email || !pass || !name) { alert("Please fill all fields"); return; }

    auth.createUserWithEmailAndPassword(email, pass)
        .then((cred) => {
            // Save user details to Firestore
            return db.collection('students').doc(cred.user.uid).set({
                name: name,
                class: studentClass,
                email: email,
                xp: 0
            });
        })
        .then(() => {
            alert("Account created successfully!");
            window.location.href = "dashboard.html";
        })
        .catch((error) => alert(error.message));
}

// 3. Login User
function loginUser() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    if(!email || !pass) { alert("Please enter email and password"); return; }

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            window.location.href = "dashboard.html";
        })
        .catch((error) => alert(error.message));
}

// 4. Logout
function logout() {
    auth.signOut().then(() => window.location.href = "index.html");
}

// 5. Auth Guard (Used in Dashboard)
function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "index.html";
        } else {
            // Load user name if element exists
            if(document.getElementById('user-name')) {
                db.collection('students').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        document.getElementById('user-name').innerText = doc.data().name;
                    }
                });
            }
        }
    });
}
