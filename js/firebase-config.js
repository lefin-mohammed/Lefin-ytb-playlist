console.log('Starting Firebase initialization...');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCfflktTztiZqZRSroiqkuzajtAX3wvo6o",
    authDomain: "video-watchlist-8f0c9.firebaseapp.com",
    projectId: "video-watchlist-8f0c9",
    storageBucket: "video-watchlist-8f0c9.firebasestorage.app",
    messagingSenderId: "459001017752",
    appId: "1:459001017752:web:cdd4844e085f663f39a7ed"
};

// Initialize Firebase with error handling
let firebaseApp;
let auth;
let db;

try {
    console.log('Initializing Firebase...');
    
    // Check if Firebase is already initialized
    if (firebase.apps.length === 0) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        console.log('Firebase app initialized successfully');
    } else {
        firebaseApp = firebase.app();
        console.log('Using existing Firebase app instance');
    }
    
    // Initialize services
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Configure Firestore settings
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        merge: true
    });
    
    // Enable offline persistence
    db.enablePersistence()
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code === 'unimplemented') {
                console.warn('The current browser does not support persistence.');
            } else {
                console.error('Error enabling persistence:', err);
            }
        });
    
    console.log('Firebase services initialized successfully');
    
    // Export services to window object
    window.firebaseServices = {
        app: firebaseApp,
        auth: auth,
        db: db
    };
    
    console.log('Firebase configuration completed');
} catch (error) {
    console.error('Critical error initializing Firebase:', error);
    // Dispatch a custom event to notify the app of initialization failure
    window.dispatchEvent(new CustomEvent('firebaseInitError', { detail: error }));
} 
