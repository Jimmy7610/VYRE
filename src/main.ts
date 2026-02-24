/// <reference types="vite/client" />
import { getGlobalFeed, Post } from '../api/feed';
import { supabase } from './lib/supabase';
import './styles.css';

const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const betaAccessContainer = document.getElementById('beta-access-container');
const betaAccessBtn = document.getElementById('beta-access-btn');
const logoutBtn = document.getElementById('logout-btn');
const feedContainer = document.getElementById('feed-container');
const loadingSpinner = document.getElementById('loading-spinner');

// Auth Form Elements
const authForm = document.getElementById('auth-form') as HTMLFormElement;
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;
const authErrorMsg = document.getElementById('auth-error-msg');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');

// Header Elements
const userHandle = document.getElementById('user-handle');
const betaPill = document.getElementById('beta-pill');

// Compose Elements
const composeContainer = document.getElementById('compose-container');
const composeText = document.getElementById('compose-text') as HTMLTextAreaElement;
const composeFile = document.getElementById('compose-file') as HTMLInputElement;
const composeImagePreviewContainer = document.getElementById('compose-image-preview-container');
const composeImagePreview = document.getElementById('compose-image-preview') as HTMLImageElement;
const composeImageRemove = document.getElementById('compose-image-remove');
const composeError = document.getElementById('compose-error');
const composeBtn = document.getElementById('compose-btn') as HTMLButtonElement;
const composeBtnText = document.getElementById('compose-btn-text');
const composeBtnSpinner = document.getElementById('compose-btn-spinner');
const composeAvatarInitial = document.getElementById('compose-avatar-initial');

// Global Auth State
let currentUser: any = null;
let currentImageFile: File | null = null;

// TEMP: Beta Access Flag Enforcement
// Beta button is VISIBLE BY DEFAULT in HTML.
// This JS only hides it if VITE_BETA_MODE is explicitly set to 'false'.
// MUST BE REMOVED BEFORE PRODUCTION LAUNCH
let isBetaMode = true; // Default: show beta access
try {
  const envVal = import.meta.env?.VITE_BETA_MODE;
  if (envVal === 'false') {
    isBetaMode = false;
    betaAccessContainer?.classList.add('hidden');
  }
} catch {
  // If env checking fails entirely, keep beta mode on (safe dev default)
}
if (isBetaMode) {
  console.log('VYRE: Beta Mode Active');
}

// Check Initial Session
supabase.auth.getSession().then(({ data: { session } }) => {
  handleAuthChange(session);
});

// Listen for Auth Changes
supabase.auth.onAuthStateChange((_event, session) => {
  handleAuthChange(session);
});

function handleAuthChange(session: any) {
  currentUser = session?.user ?? null;

  if (currentUser) {
    if (userHandle) {
      // For now, display email prefix as username since no profile editing yet
      const emailPrefix = currentUser.email?.split('@')[0] || 'User';
      userHandle.textContent = `@${emailPrefix}`;
      userHandle.classList.remove('hidden');
      if (composeAvatarInitial) composeAvatarInitial.textContent = emailPrefix.charAt(0).toUpperCase();
    }
    betaPill?.classList.add('hidden');

    // Enable Compose
    composeContainer?.classList.remove('hidden');
    composeContainer?.classList.add('flex');

    showApp();
    loadFeed();
  } else {
    // If we're showing the app but no session exists, we must be in beta mode
    // (Or user just logged out)
    if (userHandle) userHandle.classList.add('hidden');
    // Disable Compose
    composeContainer?.classList.add('hidden');
    composeContainer?.classList.remove('flex');
    // @ts-ignore
    if (mainApp && !mainApp.classList.contains('hidden') && !isBetaMode) {
      showAuth();
    }
  }
}

function showApp() {
  if (authScreen && mainApp) {
    authScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
      authScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      mainApp.classList.add('flex');
    }, 500);
  }
}

function showAuth() {
  if (authScreen && mainApp) {
    mainApp.classList.add('hidden');
    mainApp.classList.remove('flex');
    authScreen.classList.remove('hidden', 'opacity-0', 'transition-opacity', 'duration-500');
    if (feedContainer) {
      Array.from(feedContainer.children).forEach(child => {
        if (child.id !== 'loading-spinner') child.remove();
      });
    }
  }
}

// Handle Beta Access Login
betaAccessBtn?.addEventListener('click', async () => {
  betaPill?.classList.remove('hidden');
  showApp();
  loadFeed();
});

// Handle Logout
logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showAuth();
});

// Handle Email/Password Login
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (authErrorMsg) authErrorMsg.textContent = '';

  if (e.submitter?.id === 'btn-login') {
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value,
    });

    if (error && authErrorMsg) {
      authErrorMsg.textContent = error.message;
    }
  }
});

// Handle Sign Up (Requires valid email, password)
btnSignup?.addEventListener('click', async () => {
  if (!authEmail.value || !authPassword.value) {
    if (authErrorMsg) authErrorMsg.textContent = 'Email and Password are required';
    return;
  }
  if (authErrorMsg) authErrorMsg.textContent = '';

  const { error } = await supabase.auth.signUp({
    email: authEmail.value,
    password: authPassword.value,
  });

  if (error && authErrorMsg) {
    authErrorMsg.textContent = error.message;
  } else if (authErrorMsg) {
    authErrorMsg.textContent = 'Check your email for a confirmation link.';
    authErrorMsg.classList.remove('text-red-500');
    authErrorMsg.classList.add('text-brand-green');
  }
});

// Compose Logic
composeText?.addEventListener('input', () => {
  if (composeError) composeError.textContent = '';
  composeBtn.disabled = composeText.value.trim().length === 0;
});

composeFile?.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (composeError) composeError.textContent = '';

  // Validate File (5MB Limit)
  if (file.size > 5 * 1024 * 1024) {
    if (composeError) composeError.textContent = 'Image must be less than 5MB';
    composeFile.value = '';
    return;
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    if (composeError) composeError.textContent = 'Only JPG, PNG, or WEBP allowed';
    composeFile.value = '';
    return;
  }

  currentImageFile = file;

  // Show Preview
  const objectUrl = URL.createObjectURL(file);
  if (composeImagePreview) composeImagePreview.src = objectUrl;
  composeImagePreviewContainer?.classList.remove('hidden');

  // Enable post button even if text is empty? No, keep text mandatory for now or allow just image.
  // Let's allow publishing if either text exists OR image exists
  composeBtn.disabled = false;
});

composeImageRemove?.addEventListener('click', () => {
  currentImageFile = null;
  composeFile.value = '';
  composeImagePreviewContainer?.classList.add('hidden');
  if (composeImagePreview) {
    URL.revokeObjectURL(composeImagePreview.src);
    composeImagePreview.src = '';
  }

  // Re-evaluate button state
  composeBtn.disabled = composeText.value.trim().length === 0;
});

import { createPost, uploadImage } from '../api/feed';

composeBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  const content = composeText.value.trim();

  // Need either content or image
  if (content.length === 0 && !currentImageFile) return;

  try {
    // 1. Loading UI
    composeBtn.disabled = true;
    composeBtnText?.classList.add('opacity-0');
    composeBtnSpinner?.classList.remove('hidden');
    if (composeError) composeError.textContent = '';

    // Disable inputs
    composeText.disabled = true;
    composeFile.disabled = true;

    // 2. Upload Image if exists
    let imageUrl = undefined;
    if (currentImageFile) {
      imageUrl = await uploadImage(currentImageFile);
    }

    // 3. Create Post
    await createPost(content, currentUser.id, imageUrl);

    // 4. Reset UI
    composeText.value = '';
    composeImageRemove?.click(); // Clears image and re-evaluates button
    composeBtn.disabled = true; // Force disable since it's empty now

    // 5. Refresh Feed
    // We could prepend, but reloading ensures purity and proper sorting
    if (feedContainer) {
      Array.from(feedContainer.children).forEach(child => {
        if (child.id !== 'loading-spinner') child.remove();
      });
      await loadFeed();
    }

  } catch (err: any) {
    console.error('Post creation failed:', err);
    if (composeError) composeError.textContent = 'Failed to broadcast signal. Try again.';
  } finally {
    // Restore UI
    composeBtnText?.classList.remove('opacity-0');
    composeBtnSpinner?.classList.add('hidden');
    composeText.disabled = false;
    composeFile.disabled = false;
    // Keep button disabled if empty, otherwise re-enable
    composeBtn.disabled = composeText.value.trim().length === 0 && !currentImageFile;
  }
});

// Render Feed
async function loadFeed() {
  if (!feedContainer || !loadingSpinner) return;

  loadingSpinner.classList.remove('hidden');

  try {
    const response = await getGlobalFeed();
    loadingSpinner.classList.add('hidden');

    response.data.forEach(post => {
      const postEl = createPostElement(post);
      feedContainer.appendChild(postEl);
    });

  } catch (error) {
    console.error('Failed to load feed:', error);
    loadingSpinner.classList.add('hidden');
    const errorEl = document.createElement('div');
    errorEl.className = 'p-4 text-center text-red-500 font-mono text-xs';
    errorEl.textContent = 'Failed to load signal.';
    feedContainer.appendChild(errorEl);
  }
}

function createPostElement(post: Post): HTMLElement {
  const article = document.createElement('article');
  article.className = 'w-full border-b border-gray-900 p-4 hover:bg-gray-900/20 transition-colors pt-5';

  const time = new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let imageHtml = '';
  if (post.imageUrl) {
    imageHtml = `
      <div class="mt-3 w-full rounded-sm overflow-hidden border border-gray-800 bg-gray-900 aspect-video relative">
        <img src="${post.imageUrl}" alt="Post media" class="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500 cursor-pointer" loading="lazy" />
      </div>
    `;
  }

  article.innerHTML = `
    <div class="flex gap-3">
      <!-- Avatar Placeholder -->
      <div class="w-10 h-10 rounded-sm bg-gray-800 flex-shrink-0 flex items-center justify-center border border-gray-700">
        <span class="text-xs font-mono text-gray-400">${post.author.username.charAt(0).toUpperCase()}</span>
      </div>
      
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between mb-1">
          <h3 class="font-bold text-gray-200 truncate pr-2 tracking-tight">${post.author.username}</h3>
          <time class="text-[10px] text-gray-600 font-mono flex-shrink-0">${time}</time>
        </div>
        
        <p class="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">${post.content}</p>
        
        ${imageHtml}
        
        <!-- Actions -->
        <div class="flex items-center gap-6 mt-4 text-gray-500">
          <button class="flex items-center gap-1.5 transition-colors group relative ${!currentUser ? 'opacity-50 cursor-not-allowed group/tooltip' : 'hover:text-brand-orange'}" ${!currentUser ? 'disabled' : ''}>
            <svg class="w-4 h-4 ${currentUser ? 'group-hover:scale-110' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span class="text-xs font-mono">${post.comments}</span>
            ${!currentUser ? '<span class="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 border border-gray-800 text-gray-300 px-2 py-1 rounded-sm text-[10px] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">Sign in to comment</span>' : ''}
          </button>
          
          <button class="flex items-center gap-1.5 transition-colors group relative ${!currentUser ? 'opacity-50 cursor-not-allowed group/tooltip' : 'hover:text-brand-green'}" ${!currentUser ? 'disabled' : ''}>
            <svg class="w-4 h-4 ${currentUser ? 'group-hover:scale-110' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            <span class="text-xs font-mono">${post.likes}</span>
            ${!currentUser ? '<span class="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 border border-gray-800 text-gray-300 px-2 py-1 rounded-sm text-[10px] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">Sign in to like</span>' : ''}
          </button>
        </div>
      </div>
    </div>
  `;

  return article;
}
