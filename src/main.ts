/// <reference types="vite/client" />
import { getGlobalFeed, Post, SupabaseDevError, checkSchemaStatus } from '../api/feed';
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
const betaBar = document.getElementById('beta-bar');
const betaRefreshBtn = document.getElementById('beta-refresh-btn');
const betaSigninBtn = document.getElementById('beta-signin-btn');

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
let inBetaSession = false;

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

// Only initialize Supabase Auth if credentials exist
const hasSupabaseCredentials = Boolean(
  import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY
);

if (hasSupabaseCredentials && supabase) {
  // Check Initial Session
  supabase.auth.getSession().then(({ data: { session } }) => {
    handleAuthChange(session);
  }).catch((err: any) => console.warn('VYRE: Session check failed:', err));

  // Listen for Auth Changes
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthChange(session);
  });
} else {
  console.warn('VYRE: No Supabase credentials. Auth disabled. Beta mode available.');
}

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
    betaBar?.classList.add('hidden');
    betaBar?.classList.remove('flex');

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
    // Only redirect to auth screen if NOT in beta session
    if (mainApp && !mainApp.classList.contains('hidden') && !isBetaMode && !inBetaSession) {
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
betaAccessBtn?.addEventListener('click', () => {
  console.log('VYRE: Beta Access clicked');
  inBetaSession = true;
  betaBar?.classList.remove('hidden');
  betaBar?.classList.add('flex');
  showApp();
  loadFeed();
});

// Handle Beta Bar Actions
betaRefreshBtn?.addEventListener('click', () => {
  if (feedContainer) {
    Array.from(feedContainer.children).forEach(child => {
      if (child.id !== 'loading-spinner') child.remove();
    });
    loadFeed();
  }
});

betaSigninBtn?.addEventListener('click', () => {
  inBetaSession = false;
  showAuth();
});

// Handle Logout
logoutBtn?.addEventListener('click', async () => {
  if (supabase) await supabase.auth.signOut();
  showAuth();
});

// Handle Email/Password Login
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (authErrorMsg) authErrorMsg.textContent = '';

  if (e.submitter?.id === 'btn-login') {
    const { error } = await supabase!.auth.signInWithPassword({
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

  const { error } = await supabase!.auth.signUp({
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
    if (composeError) {
      const devErr = err as SupabaseDevError;
      composeError.innerHTML = `${devErr.userMessage || 'Post failed'}${devErr.details ? ` <details class="inline"><summary class="cursor-pointer text-gray-500 ml-1">[dev]</summary><span class="text-gray-500 block mt-1">${devErr.code ? devErr.code + ': ' : ''}${devErr.details}</span></details>` : ''}`;
    }
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

    if (response.data.length === 0) {
      feedContainer.appendChild(createEmptyState());
      return;
    }

    response.data.forEach(post => {
      const postEl = createPostElement(post);
      feedContainer.appendChild(postEl);
    });

  } catch (error: any) {
    console.error('Failed to load feed:', error);
    loadingSpinner.classList.add('hidden');
    const devErr = error as SupabaseDevError;
    const errorEl = document.createElement('div');
    errorEl.className = 'p-6 text-center font-mono';
    errorEl.innerHTML = `
      <p class="text-red-500 text-sm mb-2">${devErr.userMessage || 'Failed to load signal'}</p>
      ${devErr.details ? `
        <details class="text-left bg-gray-900 border border-gray-800 rounded-sm p-3 mt-2">
          <summary class="text-gray-500 text-[10px] cursor-pointer hover:text-gray-300 transition-colors">Dev details</summary>
          <div class="mt-2 text-[11px] text-gray-400 space-y-1">
            ${devErr.code ? `<p><span class="text-gray-600">Code:</span> ${devErr.code}</p>` : ''}
            <p><span class="text-gray-600">Message:</span> ${devErr.details}</p>
          </div>
        </details>` : ''}
    `;
    feedContainer.appendChild(errorEl);
  }
}

function createEmptyState(): HTMLElement {
  const div = document.createElement('div');
  div.className = 'flex flex-col items-center justify-center py-20 px-6 text-center';
  div.innerHTML = `
    <div class="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
      <svg class="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
    </div>
    <h3 class="text-gray-300 font-semibold text-sm mb-1">No posts yet</h3>
    <p class="text-gray-600 text-xs font-mono mb-4">Sign in to create the first post.</p>
    <button id="empty-signin-btn" class="px-4 py-2 text-[11px] font-mono text-black bg-gray-100 rounded-sm hover:bg-white transition-colors font-semibold">Sign in</button>
  `;

  // Wire up the Sign In button inside the empty state
  setTimeout(() => {
    document.getElementById('empty-signin-btn')?.addEventListener('click', () => {
      inBetaSession = false;
      showAuth();
    });
  }, 0);

  return div;
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
          <button class="flex items-center gap-1.5 transition-colors group relative ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:text-brand-orange'}" ${!currentUser ? 'disabled title="Sign in to interact"' : ''}>
            <svg class="w-4 h-4 ${currentUser ? 'group-hover:scale-110' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span class="text-xs font-mono">${post.comments}</span>
          </button>
          
          <button class="flex items-center gap-1.5 transition-colors group relative ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:text-brand-green'}" ${!currentUser ? 'disabled title="Sign in to interact"' : ''}>
            <svg class="w-4 h-4 ${currentUser ? 'group-hover:scale-110' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            <span class="text-xs font-mono">${post.likes}</span>
          </button>

          <button class="flex items-center gap-1.5 transition-colors group relative ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-300'}" ${!currentUser ? 'disabled title="Sign in to interact"' : ''}>
            <svg class="w-4 h-4 ${currentUser ? 'group-hover:scale-110' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
          </button>
        </div>
        ${!currentUser ? '<p class="text-[10px] text-gray-600 font-mono mt-2">Sign in to interact</p>' : ''}
      </div>
    </div>
  `;

  return article;
}

// === DEBUG PANEL ===
const debugPanel = document.getElementById('debug-panel');
const debugCloseBtn = document.getElementById('debug-close-btn');
const debugContent = document.getElementById('debug-content');

async function openDebugPanel() {
  if (!debugPanel || !debugContent) return;
  debugPanel.classList.remove('hidden');
  debugContent.innerHTML = '<div class="text-gray-500 text-xs font-mono animate-pulse">Running checks...</div>';

  try {
    const status = await checkSchemaStatus();
    debugContent.innerHTML = `
      <div class="space-y-2">
        ${Object.entries(status).map(([key, val]) => `
          <div class="flex items-start gap-3 bg-gray-900/50 border border-gray-800 rounded-sm p-3">
            <span class="text-[10px] text-gray-600 font-mono uppercase w-16 shrink-0 pt-0.5">${key}</span>
            <span class="text-[11px] font-mono ${val.startsWith('✅') ? 'text-green-500' : val.startsWith('⚠') ? 'text-yellow-500' : 'text-red-400'}">${val}</span>
          </div>`).join('')}
      </div>
    `;
  } catch (err: any) {
    debugContent.innerHTML = `<p class="text-red-500 text-xs font-mono">Debug check failed: ${err.message}</p>`;
  }
}

debugCloseBtn?.addEventListener('click', () => {
  debugPanel?.classList.add('hidden');
});

// Keyboard shortcut: Ctrl+Shift+D opens debug panel
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    if (debugPanel?.classList.contains('hidden')) {
      openDebugPanel();
    } else {
      debugPanel?.classList.add('hidden');
    }
  }
});
