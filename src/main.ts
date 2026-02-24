import { getGlobalFeed, Post } from '../api/feed';
import './styles.css';

const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const betaAccessContainer = document.getElementById('beta-access-container');
const betaAccessBtn = document.getElementById('beta-access-btn');
const logoutBtn = document.getElementById('logout-btn');
const feedContainer = document.getElementById('feed-container');
const loadingSpinner = document.getElementById('loading-spinner');

// TEMP: Beta Access Flag Enforcement
// MUST BE REMOVED BEFORE PRODUCTION LAUNCH
if (import.meta.env.VITE_BETA_MODE === 'true') {
  console.log('VYRE: Beta Mode Active');
  betaAccessContainer?.classList.remove('hidden');
}

// Handle Beta Access Login
betaAccessBtn?.addEventListener('click', async () => {
  if (authScreen && mainApp) {
    // Basic transition
    authScreen.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
      authScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      mainApp.classList.add('flex');
      loadFeed();
    }, 500);
  }
});

// Handle Logout
logoutBtn?.addEventListener('click', () => {
  if (authScreen && mainApp) {
    mainApp.classList.add('hidden');
    mainApp.classList.remove('flex');
    authScreen.classList.remove('hidden', 'opacity-0');
    if (feedContainer) {
      // Clear feed on logout
      Array.from(feedContainer.children).forEach(child => {
        if (child.id !== 'loading-spinner') {
          child.remove();
        }
      });
    }
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
          <button class="flex items-center gap-1.5 hover:text-brand-orange transition-colors group">
            <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span class="text-xs font-mono">${post.comments}</span>
          </button>
          
          <button class="flex items-center gap-1.5 hover:text-brand-green transition-colors group">
            <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            <span class="text-xs font-mono">${post.likes}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  return article;
}
