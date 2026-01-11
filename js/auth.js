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
    
    init: () => {
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

                // --- CLOUD SYNC ---
                const cloudData = await loadFromCloud(user.uid);
                
                if (cloudData) {
                    console.log("📥 Downloading data from cloud...");
                    app.data.tasks = cloudData.tasks || [];
                    app.data.subjects = cloudData.subjects || [];
                    app.data.targetDate = cloudData.targetDate || app.data.targetDate;
                    app.saveData({ render: true }); 
                } else {
                    console.log("📤 First login: Uploading local data to cloud.");
                    app.saveData({ render: false });
                }

                app.navigate('dashboard');
            } else {
                app.data.user = null;
                console.log("🔒 User logged out");
                authOps.updateUI(false);
                app.navigate('landing');
            }

            const loader = document.getElementById('app-loading-screen');
            if (loader) {
                loader.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => {
                    if (loader.parentNode) loader.parentNode.removeChild(loader);
                }, 500);
            }
        });
    },

    loginGoogle: async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            document.getElementById('authModal').classList.add('hidden');
            await uiAlert("Welcome back, Scholar!");
        } catch (error) {
            console.error(error);
            await uiAlert(`Login Failed: ${error.message}`);
        }
    },

    loginEmail: async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            document.getElementById('authModal').classList.add('hidden');
        } catch (error) {
            await uiAlert(`Login Failed: ${error.message}`);
        }
    },
    
    registerEmail: async (email, password) => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            document.getElementById('authModal').classList.add('hidden');
            await uiAlert("Account created successfully!");
        } catch (error) {
            await uiAlert(`Signup Failed: ${error.message}`);
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            await uiAlert("Logged out successfully.");
        } catch (error) {
            console.error(error);
        }
    },

    updateUI: (isLoggedIn) => {
        const loginBtn = document.getElementById('navLoginBtn');
        const userProfile = document.getElementById('navUserProfile');
        const userImg = document.getElementById('navUserImg');
        const userName = document.getElementById('navUserName');
        
        if (isLoggedIn && window.app.data.user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            
            if (userImg) {
                userImg.src = window.app.data.user.photoURL || `https://ui-avatars.com/api/?name=${window.app.data.user.displayName}&background=random`;
            }
            if (userName) userName.textContent = window.app.data.user.displayName;
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
        }
    }
};