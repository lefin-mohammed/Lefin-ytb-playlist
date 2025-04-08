// YouTube API Key
const YOUTUBE_API_KEY = 'AIzaSyC0lC3rl1sV_reqVMBxzdKBqZtwBWuJl-Y';

// Rate limiting
const RATE_LIMIT = {
    maxRequests: 100,
    timeWindow: 60000, // 1 minute
    requests: []
};

// DOM Elements
let loadingScreen, welcomeSection, mainContent;
let loginBtn, logoutBtn, addVideoBtn, searchInput;
let videoList, categoryFilter;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM Content Loaded');
        
        // Initialize DOM elements
        initializeDOMElements();
        
        // Show loading screen
        showLoadingScreen();
        
        // Set timeout to hide loading screen after 5 seconds (fallback)
        const loadingTimeout = setTimeout(() => {
            console.log('Loading timeout reached, hiding loading screen');
            hideLoadingScreen();
            showMessage('Application loaded with limited functionality', 'warning');
        }, 5000);
        
        // Listen for Firebase initialization errors
        window.addEventListener('firebaseInitError', (event) => {
            console.error('Firebase initialization error:', event.detail);
            clearTimeout(loadingTimeout);
            hideLoadingScreen();
            showMessage('Error connecting to database. Some features may be limited.', 'error');
        });
        
        // Check if Firebase services are available
        if (!window.firebaseServices) {
            console.error('Firebase services not initialized');
            clearTimeout(loadingTimeout);
            hideLoadingScreen();
            showMessage('Error: Firebase services not available', 'error');
            return;
        }

        // Get Firebase services
        const { auth, db } = window.firebaseServices;
        
        // Set up authentication state observer
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'logged in' : 'logged out');
            clearTimeout(loadingTimeout);
            hideLoadingScreen();
            
            if (user) {
                welcomeSection.style.display = 'none';
                mainContent.style.display = 'block';
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'block';
                loadVideos();
            } else {
                welcomeSection.style.display = 'flex';
                mainContent.style.display = 'none';
                loginBtn.style.display = 'block';
                logoutBtn.style.display = 'none';
            }
        });

        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error during initialization:', error);
        showMessage('Error initializing application', 'error');
        hideLoadingScreen();
    }
});

// Initialize DOM elements
function initializeDOMElements() {
    console.log('Initializing DOM elements');
    loadingScreen = document.getElementById('loading-screen');
    welcomeSection = document.getElementById('welcome-section');
    mainContent = document.getElementById('main-content');
    loginBtn = document.getElementById('welcome-login-btn');
    logoutBtn = document.getElementById('logoutBtn');
    addVideoBtn = document.getElementById('addVideoBtn');
    searchInput = document.getElementById('searchInput');
    videoList = document.getElementById('videoList');
    categoryFilter = document.querySelector('.category-filter');

    // Verify all elements are found
    const elements = {
        loadingScreen,
        welcomeSection,
        mainContent,
        loginBtn,
        logoutBtn,
        addVideoBtn,
        searchInput,
        videoList,
        categoryFilter
    };

    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${name}`);
        }
    }
}

// Show loading screen
function showLoadingScreen() {
    console.log('Showing loading screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    } else {
        console.error('Loading screen element not found');
    }
}

// Hide loading screen
function hideLoadingScreen() {
    console.log('Hiding loading screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    } else {
        console.error('Loading screen element not found');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Authentication buttons
    document.getElementById('welcome-login-btn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('main-login-btn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('logoutBtn').addEventListener('click', handleSignOut);
    
    // Video management
    document.getElementById('addVideoBtn').addEventListener('click', addVideo);
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
    
    // Category filter
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterVideos(button.dataset.category);
        });
    });
}

// Handle Google Sign In
async function handleGoogleSignIn() {
    try {
        showLoadingScreen();
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        hideLoadingScreen();
    } catch (error) {
        console.error('Error signing in with Google:', error);
        hideLoadingScreen();
        showMessage(`Sign in failed: ${error.message}`, 'error');
    }
}

// Handle Sign Out
async function handleSignOut() {
    try {
        showLoadingScreen();
        await auth.signOut();
        hideLoadingScreen();
    } catch (error) {
        console.error('Error signing out:', error);
        hideLoadingScreen();
        showMessage(`Sign out failed: ${error.message}`, 'error');
    }
}

// Add video to watchlist
async function addVideo() {
    try {
        const videoUrl = document.getElementById('videoUrl').value.trim();
        const category = document.getElementById('category').value;
        
        if (!videoUrl) {
            showMessage('Please enter a video URL', 'error');
            return;
        }

        if (!validateYouTubeUrl(videoUrl)) {
            showMessage('Please enter a valid YouTube URL', 'error');
            return;
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            showMessage('Could not extract video ID from URL', 'error');
            return;
        }

        // Check if video already exists in user's watchlist
        const existingVideo = await db.collection('videos')
            .where('userId', '==', auth.currentUser.uid)
            .where('videoId', '==', videoId)
            .get();

        if (!existingVideo.empty) {
            showMessage('This video is already in your watchlist', 'error');
            return;
        }

        // Show loading indicator
        const addButton = document.getElementById('addVideoBtn');
        const originalText = addButton.textContent;
        addButton.textContent = 'Adding...';
        addButton.disabled = true;

        // Check rate limit
        if (!checkRateLimit()) {
            showMessage('Rate limit exceeded. Please try again later.', 'error');
            addButton.textContent = originalText;
            addButton.disabled = false;
            return;
        }

        // Fetch video details from YouTube API
        console.log('Fetching video details for ID:', videoId);
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`);
        const data = await response.json();
        
        console.log('YouTube API Response:', data);

        if (data.error) {
            console.error('YouTube API Error:', data.error);
            if (data.error.code === 403) {
                showMessage('YouTube API access denied. Please check API key permissions.', 'error');
            } else {
                showMessage(`YouTube API Error: ${data.error.message}`, 'error');
            }
            addButton.textContent = originalText;
            addButton.disabled = false;
            return;
        }

        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
            showMessage('Video not found. Please check the URL and try again.', 'error');
            addButton.textContent = originalText;
            addButton.disabled = false;
            return;
        }

        const videoDetails = data.items[0].snippet;
        if (!videoDetails) {
            showMessage('Could not fetch video details. Please try again.', 'error');
            addButton.textContent = originalText;
            addButton.disabled = false;
            return;
        }

        const videoData = {
            userId: auth.currentUser.uid,
            videoId: videoId,
            title: videoDetails.title || 'Untitled Video',
            description: videoDetails.description || '',
            thumbnail: videoDetails.thumbnails?.medium?.url || '',
            category: category,
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            watched: false
        };

        console.log('Adding video to Firestore:', videoData);
        await db.collection('videos').add(videoData);
        
        document.getElementById('videoUrl').value = '';
        showMessage('Video added successfully!', 'success');
        loadVideos();
        
        // Reset button
        addButton.textContent = originalText;
        addButton.disabled = false;
    } catch (error) {
        console.error('Error adding video:', error);
        showMessage(`Error: ${error.message}`, 'error');
        
        // Reset button
        const addButton = document.getElementById('addVideoBtn');
        addButton.textContent = 'Add Video';
        addButton.disabled = false;
    }
}

// Load videos from Firestore
async function loadVideos() {
    try {
        showLoadingScreen();
        
        const snapshot = await db.collection('videos')
            .where('userId', '==', auth.currentUser.uid)
            .orderBy('addedAt', 'desc')
            .get();
            
        const videos = [];
        snapshot.forEach(doc => {
            videos.push({ id: doc.id, ...doc.data() });
        });
        
        displayVideos(videos);
        hideLoadingScreen();
    } catch (error) {
        console.error('Error loading videos:', error);
        showMessage(`Error loading videos: ${error.message}`, 'error');
        hideLoadingScreen();
    }
}

// Display videos in the UI
function displayVideos(videos) {
    if (!videoList) return;
    
    if (videos.length === 0) {
        videoList.innerHTML = '<div class="no-videos">No videos in your watchlist yet. Add some videos to get started!</div>';
        return;
    }
    
    videoList.innerHTML = '';
    
    videos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = `video-card ${video.watched ? 'watched' : ''}`;
        videoCard.innerHTML = `
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                <div class="video-category">${video.category}</div>
            </div>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.description.substring(0, 100)}${video.description.length > 100 ? '...' : ''}</p>
                <div class="video-actions">
                    <button class="btn watch-btn" data-id="${video.id}">
                        <i class="fas ${video.watched ? 'fa-eye-slash' : 'fa-eye'}"></i>
                        ${video.watched ? 'Mark as Unwatched' : 'Mark as Watched'}
                    </button>
                    <button class="btn delete-btn" data-id="${video.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        videoList.appendChild(videoCard);
    });
    
    // Add event listeners to the new buttons
    document.querySelectorAll('.watch-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleWatchedStatus(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteVideo(btn.dataset.id));
    });
}

// Toggle watched status
async function toggleWatchedStatus(videoId) {
    try {
        const videoRef = db.collection('videos').doc(videoId);
        const video = await videoRef.get();
        
        if (!video.exists) {
            showMessage('Video not found', 'error');
            return;
        }
        
        const currentStatus = video.data().watched;
        await videoRef.update({
            watched: !currentStatus
        });
        
        showMessage(`Video marked as ${!currentStatus ? 'watched' : 'unwatched'}`, 'success');
        loadVideos();
    } catch (error) {
        console.error('Error toggling watched status:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Delete video
async function deleteVideo(videoId) {
    try {
        if (!confirm('Are you sure you want to delete this video?')) {
            return;
        }
        
        await db.collection('videos').doc(videoId).delete();
        showMessage('Video deleted successfully', 'success');
        loadVideos();
    } catch (error) {
        console.error('Error deleting video:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Filter videos by category
function filterVideos(category) {
    const videos = document.querySelectorAll('.video-card');
    
    videos.forEach(video => {
        const videoCategory = video.querySelector('.video-category').textContent.toLowerCase();
        
        if (category === 'all' || videoCategory === category) {
            video.style.display = 'flex';
        } else {
            video.style.display = 'none';
        }
    });
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const videos = document.querySelectorAll('.video-card');
    
    videos.forEach(video => {
        const title = video.querySelector('h3').textContent.toLowerCase();
        const description = video.querySelector('p').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            video.style.display = 'flex';
        } else {
            video.style.display = 'none';
        }
    });
}

// Validate YouTube URL
function validateYouTubeUrl(url) {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return regex.test(url);
}

// Extract video ID from URL
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Check rate limit
function checkRateLimit() {
    const now = Date.now();
    RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.timeWindow);
    
    if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
        return false;
    }
    
    RATE_LIMIT.requests.push(now);
    return true;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show message to user
function showMessage(message, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message ${type}`;
    messageContainer.textContent = message;
    
    document.body.appendChild(messageContainer);
    
    setTimeout(() => {
        messageContainer.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        messageContainer.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(messageContainer);
        }, 300);
    }, 3000);
} 
