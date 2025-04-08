// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC0lC3rl1sV_reqVMBxzdKBqZtwBWuJl-Y",
    authDomain: "video-watchlist-7f0c9.firebaseapp.com",
    projectId: "video-watchlist-7f0c9",
    storageBucket: "video-watchlist-7f0c9.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
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
