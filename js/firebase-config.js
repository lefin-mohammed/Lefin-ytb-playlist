// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfflktTztiZqZRSroiqkuzajtAX3wvo6o",
    authDomain: "videowatchlist-3a64c.firebaseapp.com",
    projectId: "videowatchlist-3a64c",
    storageBucket: "videowatchlist-3a64c.firebasestorage.app",
    messagingSenderId: "459001017752",
    appId: "1:459001017752:web:cdd4844e085f663f39a7ed"
};

console.log('Starting Firebase initialization...');

// Initialize Firebase
try {
    console.log('Initializing Firebase...');
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');

    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Export services to window object
    window.firebaseServices = {
        auth,
        db
    };
    
    console.log('Firebase services initialized successfully');
} catch (error) {
    console.error('Critical error initializing Firebase:', error);
    // Dispatch custom event for error handling
    window.dispatchEvent(new CustomEvent('firebaseInitError', { detail: error }));
} 
