// js/auth.js
import { auth } from './firebase-config.js';
import { loadFromCloud } from './storage.js'; 
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { uiAlert } from './dialogs.js';

const googleProvider = new GoogleAuthProvider();

export const authOps = {
    
    // FIX #1: Promise resolves exactly once (Stabilized Init)
    init: () => {
        return new Promise((resolve) => {
            let isInitialized = false; // Guard against multiple resolutions

            onAuthStateChanged(auth, async (user) => {
                const app = window.app; 
                
                if (user) {
                    app.data.user = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        photoURL: user.photoURL
                    };
                    
                    console.log("✅ Auth Success:", app.data.user.email);
                    authOps.updateUI(true);

                    // --- CLOUD SYNC START ---
                    try {
                        const cloudData = await loadFromCloud(user.uid);
                        
                        // FIX #3: Defensive Cloud Conflict Guard
                        const localTime = app.data.lastBackup || "";
                        const cloudTime = cloudData?.lastBackup || "";

                        if (cloudData && cloudTime > localTime) {
                            console.log("📥 Cloud is newer: Downloading data...");
                            app.data.tasks = cloudData.tasks || [];
                            app.data.subjects = cloudData.subjects || [];
                            app.data.targetDate = cloudData.targetDate || app.data.targetDate;
                            app.data.lastBackup = cloudData.lastBackup; // Sync timestamp
                            
                            app.saveData({ render: true }); 
                        } else {
                            console.log("📤 Local is newer: Uploading to cloud.");
                            // This triggers saveToCloud via app.saveData
                            app.saveData({ render: false });
                        }
                    } catch (e) {
                        console.error("Sync failed:", e);
                    }
                    // --- CLOUD SYNC END ---

                } else {
                    app.data.user = null;
                    console.log("🔒 User logged out");
                    authOps.updateUI(false);
                }

                // Remove Loader
                const loader = document.getElementById('app-loading-screen');
                if (loader) {
                    loader.classList.add('opacity-0', 'pointer-events-none');
                    setTimeout(() => {
                        if (loader.parentNode) loader.parentNode.removeChild(loader);
                    }, 500);
                }

                // FIX #1: Resolve init() promise only on the first run
                if (!isInitialized) {
                    isInitialized = true;
                    resolve(user); 
                }
            });
        });
    },

    loginGoogle: async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            document.getElementById('authModal').classList.add('hidden');
            await uiAlert("Welcome back, Scholar!");
            window.app.navigate('dashboard'); 
        } catch (error) {
            console.error(error);
            await uiAlert(`Login Failed: ${error.message}`);
        }
    },

    loginEmail: async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            document.getElementById('authModal').classList.add('hidden');
            window.app.navigate('dashboard');
        } catch (error) {
            await uiAlert(`Login Failed: ${error.message}`);
        }
    },
    
    registerEmail: async (email, password) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            document.getElementById('authModal').classList.add('hidden');
            await uiAlert("Account created successfully!");
            window.app.navigate('dashboard');
        } catch (error) {
            await uiAlert(`Signup Failed: ${error.message}`);
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            await uiAlert("Logged out successfully.");
            window.app.navigate('landing');
        } catch (error) {
            console.error(error);
        }
    },

    updateUI: (isLoggedIn) => {
        const loginBtn = document.getElementById('navLoginBtn');
        const userProfile = document.getElementById('navUserProfile');
        const userImg = document.getElementById('navUserImg');
        const userName = document.getElementById('navUserName');
        
        if (loginBtn && userProfile) {
            if (isLoggedIn && window.app.data.user) {
                loginBtn.classList.add('hidden');
                userProfile.classList.remove('hidden');
                
                if (userImg) userImg.src = window.app.data.user.photoURL || `https://ui-avatars.com/api/?name=${window.app.data.user.displayName}&background=random`;
                if (userName) userName.textContent = window.app.data.user.displayName;
            } else {
                loginBtn.classList.remove('hidden');
                userProfile.classList.add('hidden');
            }
        }
    }
};