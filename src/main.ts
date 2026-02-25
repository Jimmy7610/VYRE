/// <reference types="vite/client" />
import { getGlobalFeed, Post, SupabaseDevError, checkSchemaStatus, fetchUserLikes, toggleLike, fetchComments, submitComment, Comment } from '../api/feed';
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
const userHandle = document.getElementById('user-handle-initial');
const userHandleIcon = document.getElementById('user-handle-icon');
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
      const emailPrefix = currentUser.email?.split('@')[0] || 'User';
      userHandle.textContent = emailPrefix.charAt(0).toUpperCase();
      userHandle.classList.remove('hidden');
      userHandleIcon?.classList.add('hidden');
      if (composeAvatarInitial) composeAvatarInitial.textContent = emailPrefix.charAt(0).toUpperCase();
    }
    betaBar?.classList.add('hidden');

    // Enable Compose
    composeContainer?.classList.remove('hidden');

    showApp();
    loadFeed();
  } else {
    // If we're showing the app but no session exists, we must be in beta mode
    // (Or user just logged out)
    if (userHandle) {
      userHandle.classList.add('hidden');
      userHandleIcon?.classList.remove('hidden');
    }
    // Compose container state
    if (inBetaSession) {
      composeContainer?.classList.remove('hidden');
    } else {
      composeContainer?.classList.add('hidden');
    }

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
composeText?.addEventListener('focus', () => {
  if (inBetaSession && !currentUser) {
    composeText.blur();
    showToast('Read-only beta: Posting is disabled');
  }
});

composeText?.addEventListener('input', () => {
  if (inBetaSession && !currentUser) return;
  if (composeError) composeError.textContent = '';
  composeBtn.disabled = composeText.value.trim().length === 0;
});

composeFile?.addEventListener('click', (e) => {
  if (inBetaSession && !currentUser) {
    e.preventDefault();
    showToast('Read-only beta: Image upload is disabled');
  }
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

    // Fetch user likes if logged in
    if (currentUser) {
      const postIds = response.data.map(p => p.id);
      const likedPostIds = await fetchUserLikes(postIds, currentUser.id);
      response.data.forEach(p => {
        p.likedByMe = likedPostIds.has(p.id);
      });
    }

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
  div.className = 'vyre-empty-state';
  div.innerHTML = `
    <div class="vyre-post-avatar" style="width:56px; height:56px; font-size:24px; margin-bottom:16px;">
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--c-text-muted);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
    </div>
    <h3 style="color:var(--c-text); font-weight:600; font-size:var(--fs-md); margin-bottom:4px;">No posts yet</h3>
    <p style="color:var(--c-text-muted); font-size:var(--fs-sm); margin-bottom:16px;">Be the first to share something.</p>
    <button id="empty-signin-btn" class="vyre-btn-primary-sm" style="padding:8px 20px;">Sign in</button>
  `;

  setTimeout(() => {
    document.getElementById('empty-signin-btn')?.addEventListener('click', () => {
      inBetaSession = false;
      showAuth();
    });
  }, 0);

  return div;
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function createPostElement(post: Post): HTMLElement {
  const article = document.createElement('article');
  article.className = 'vyre-post';
  article.dataset.postId = post.id;

  const relTime = getRelativeTime(new Date(post.createdAt));
  const initial = post.author.username.charAt(0).toUpperCase();

  let imageHtml = '';
  if (post.imageUrl) {
    imageHtml = `
      <div class="vyre-post-image">
        <img src="${post.imageUrl}" alt="Post media" loading="lazy" />
      </div>
    `;
  }

  const isLikeDisabled = !currentUser && !inBetaSession;

  article.innerHTML = `
    <div class="vyre-post-inner">
      <div class="vyre-post-avatar">${initial}</div>
      <div class="flex-1 min-w-0">
        <div class="vyre-post-header">
          <span class="vyre-post-username">@${post.author.username}</span>
          <time class="vyre-post-time">${relTime}</time>
        </div>
        <p class="vyre-post-content">${post.content}</p>
        ${imageHtml}
        <div class="vyre-post-actions">
          <button class="vyre-action-btn like-btn ${post.likedByMe ? 'liked' : ''}" ${isLikeDisabled ? 'disabled title="Sign in to interact"' : ''}>
            <svg class="vyre-icon-heart" fill="${post.likedByMe ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            <span class="vyre-action-count like-count">${post.likes}</span>
          </button>
          <button class="vyre-action-btn comment-btn" ${!currentUser && !inBetaSession ? 'disabled title="Sign in to interact"' : ''}>
            <svg class="vyre-icon-comment" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span class="vyre-action-count comment-count">${post.comments}</span>
          </button>
          <button class="vyre-action-btn" ${!currentUser ? 'disabled title="Sign in to interact"' : ''}>
            <svg class="vyre-icon-share" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
          </button>
        </div>
        ${!currentUser ? '<p class="vyre-sign-in-hint">Sign in to interact</p>' : ''}
      </div>
    </div>
  `;

  // Like Button Logic
  const likeBtn = article.querySelector('.like-btn') as HTMLButtonElement;
  const likeCountSpan = article.querySelector('.like-count') as HTMLSpanElement;
  const heartIcon = article.querySelector('.vyre-icon-heart') as SVGElement;

  if (likeBtn) {
    let isPending = false;
    likeBtn.addEventListener('click', async () => {
      if (inBetaSession && !currentUser) {
        showToast('Read-only beta: Likes are disabled');
        return;
      }
      if (!currentUser) return;
      if (isPending) return;

      isPending = true;
      likeBtn.style.opacity = '0.5';

      // Optimistic UI update
      const wasLiked = post.likedByMe;
      post.likedByMe = !wasLiked;
      post.likes += post.likedByMe ? 1 : -1;

      likeBtn.classList.toggle('liked', post.likedByMe);
      heartIcon.setAttribute('fill', post.likedByMe ? 'currentColor' : 'none');
      likeCountSpan.textContent = post.likes.toString();

      try {
        const result = await toggleLike(post.id, currentUser.id, wasLiked);
        // Ensure count is in sync with server truth
        post.likes = result.count;
        likeCountSpan.textContent = result.count.toString();
      } catch (err: any) {
        // Revert UI on failure
        post.likedByMe = wasLiked;
        post.likes += post.likedByMe ? 1 : -1;
        likeBtn.classList.toggle('liked', post.likedByMe);
        heartIcon.setAttribute('fill', post.likedByMe ? 'currentColor' : 'none');
        likeCountSpan.textContent = post.likes.toString();
        showToast(err.userMessage || 'Failed to toggle like');
      } finally {
        isPending = false;
        likeBtn.style.opacity = '1';
      }
    });
  }

  // Comment Button Logic
  const commentBtn = article.querySelector('.comment-btn') as HTMLButtonElement;
  if (commentBtn) {
    commentBtn.addEventListener('click', () => {
      openCommentsDrawer(post);
    });
  }

  return article;
}

// === COMMENTS DRAWER LOGIC ===
const commentsDrawer = document.getElementById('comments-drawer');
const commentsBackdrop = document.getElementById('comments-backdrop');
const commentsPanel = document.getElementById('comments-panel');
const commentsCloseBtn = document.getElementById('comments-close-btn');
const commentsList = document.getElementById('comments-list');
const commentInput = document.getElementById('comment-input') as HTMLTextAreaElement;
let commentSubmitBtn = document.getElementById('comment-submit-btn') as HTMLButtonElement;

let activeCommentPostId: string | null = null;
let lastActiveElement: HTMLElement | null = null;

function closeCommentsDrawer() {
  if (!commentsDrawer || !commentsBackdrop || !commentsPanel) return;
  activeCommentPostId = null;

  // Restore scroll and focus
  document.body.style.overflow = '';
  if (lastActiveElement) {
    lastActiveElement.focus();
    lastActiveElement = null;
  }

  commentsBackdrop.classList.remove('opacity-100');
  commentsBackdrop.classList.add('opacity-0');

  commentsPanel.classList.remove('translate-y-0', 'sm:translate-x-0');
  commentsPanel.classList.add('translate-y-full', 'sm:translate-y-0', 'sm:translate-x-full');

  setTimeout(() => {
    commentsDrawer.classList.add('pointer-events-none');
    if (commentsList) commentsList.innerHTML = '';
  }, 300);
}

commentsCloseBtn?.addEventListener('click', closeCommentsDrawer);
commentsBackdrop?.addEventListener('click', closeCommentsDrawer);

async function openCommentsDrawer(post: Post) {
  if (!commentsDrawer || !commentsBackdrop || !commentsPanel || !commentsList) return;
  activeCommentPostId = post.id;
  lastActiveElement = document.activeElement as HTMLElement | null;

  // Lock body scroll
  document.body.style.overflow = 'hidden';

  // Show drawer
  commentsDrawer.classList.remove('pointer-events-none');

  // Trigger animations (small delay for display:block to take effect if we used it, but we use fixed/pointer-events)
  requestAnimationFrame(() => {
    commentsBackdrop.classList.remove('opacity-0');
    commentsBackdrop.classList.add('opacity-100');

    commentsPanel.classList.remove('translate-y-full', 'sm:translate-x-full');
    commentsPanel.classList.add('translate-y-0', 'sm:translate-x-0');
  });

  // reset composer and focus
  if (commentInput) {
    commentInput.value = '';
    commentInput.focus();
  }
  if (commentSubmitBtn) commentSubmitBtn.disabled = true;

  // loading state
  commentsList.innerHTML = `<div class="p-4 text-center text-sm font-mono text-gray-500 animate-pulse">Loading comments...</div>`;

  // fetch
  const comments = await fetchComments(post.id);

  // render
  if (activeCommentPostId !== post.id) return; // closed or changed before finish

  if (comments.length === 0) {
    commentsList.innerHTML = `<div class="p-8 text-center text-sm text-gray-400">No comments yet. Be the first to start the conversation.</div>`;
  } else {
    commentsList.innerHTML = comments.map(renderCommentItem).join('');
  }

  // Setup compose logic (clone button to clear old listeners)
  if (commentSubmitBtn) {
    const newBtn = commentSubmitBtn.cloneNode(true) as HTMLButtonElement;
    commentSubmitBtn.parentNode?.replaceChild(newBtn, commentSubmitBtn);
    commentSubmitBtn = newBtn;

    // Auto-disable if empty
    commentInput?.addEventListener('input', () => {
      commentSubmitBtn.disabled = commentInput.value.trim().length === 0;
    });

    commentSubmitBtn.addEventListener('click', async () => {
      if (inBetaSession && !currentUser) {
        showToast('Read-only beta: Comments are disabled');
        return;
      }
      if (!currentUser) {
        showToast('Please sign in to comment');
        return;
      }

      const content = commentInput.value.trim();
      if (!content) return;

      commentSubmitBtn.disabled = true;
      commentInput.disabled = true;
      commentSubmitBtn.textContent = '...';

      try {
        const newComment = await submitComment(post.id, currentUser.id, content);

        // Remove empty state if present
        if (comments.length === 0) commentsList.innerHTML = '';
        comments.push(newComment);

        // Append new comment
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderCommentItem(newComment);
        commentsList.appendChild(tempDiv.firstElementChild as HTMLElement);

        // Scroll to bottom
        commentsList.scrollTop = commentsList.scrollHeight;

        // Optimistically update post comment count UI
        post.comments += 1;
        const postCard = document.querySelector(`.vyre-post[data-post-id="${post.id}"]`);
        if (postCard) {
          const countSpan = postCard.querySelector('.comment-count');
          if (countSpan) countSpan.textContent = post.comments.toString();
        }

        commentInput.value = '';
      } catch (err: any) {
        showToast(err.userMessage || 'Failed to post comment');
      } finally {
        commentSubmitBtn.disabled = commentInput.value.trim().length === 0;
        commentInput.disabled = false;
        commentSubmitBtn.textContent = 'Post';
        commentInput.focus();
      }
    });
  }
}

// Close drawer on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeCommentPostId) {
    closeCommentsDrawer();
  }
});

function renderCommentItem(comment: Comment): string {
  const relTime = getRelativeTime(new Date(comment.createdAt));
  const initial = comment.author.username.charAt(0).toUpperCase();
  return `
    <div class="px-4 py-3 border-b border-[var(--vyre-border)] last:border-0 flex gap-3 animate-fade-in">
      <div class="vyre-post-avatar !w-8 !h-8 !text-xs shrink-0">${initial}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="vyre-post-username !text-xs">@${comment.author.username}</span>
          <span class="vyre-post-time !text-[10px]">${relTime}</span>
        </div>
        <p class="text-[13px] text-gray-200 leading-relaxed break-words whitespace-pre-wrap">${comment.content}</p>
      </div>
    </div>
  `;
}

// === SEARCH MVP ===
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

searchToggleBtn?.addEventListener('click', () => {
  if (searchInput.classList.contains('w-0')) {
    searchInput.classList.remove('w-0', 'opacity-0', 'pointer-events-none');
    searchInput.classList.add('w-48', 'sm:w-64', 'opacity-100', 'pointer-events-auto');
    searchInput.focus();
  } else {
    searchInput.classList.add('w-0', 'opacity-0', 'pointer-events-none');
    searchInput.classList.remove('w-48', 'sm:w-64', 'opacity-100', 'pointer-events-auto');
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input')); // clear filter
  }
});

searchInput?.addEventListener('input', (e) => {
  const term = (e.target as HTMLInputElement).value.toLowerCase();
  if (!feedContainer) return;

  Array.from(feedContainer.children).forEach(child => {
    if (child.id === 'loading-spinner') return;

    if (child.classList.contains('vyre-post')) {
      const username = child.querySelector('.vyre-post-username')?.textContent?.toLowerCase() || '';
      const content = child.querySelector('.vyre-post-content')?.textContent?.toLowerCase() || '';

      if (username.includes(term) || content.includes(term)) {
        (child as HTMLElement).style.display = '';
      } else {
        (child as HTMLElement).style.display = 'none';
      }
    }
  });
});

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

// === UTILS: TOAST MANAGER ===
class ToastManager {
  private container = document.getElementById('toast-container');
  private queue: { message: string, variant: 'info' | 'success' | 'error' }[] = [];
  private activeToast: HTMLElement | null = null;
  private isAnimating = false;

  show(message: string, variant: 'info' | 'success' | 'error' = 'info') {
    // Deduplicate
    if (this.queue.length > 0 && this.queue[this.queue.length - 1].message === message) return;
    if (this.activeToast?.dataset.message === message) return;

    this.queue.push({ message, variant });
    this.processQueue();
  }

  private processQueue() {
    if (this.isAnimating || this.activeToast || this.queue.length === 0 || !this.container) return;

    const toast = this.queue.shift()!;
    this.isAnimating = true;

    const el = document.createElement('div');
    el.dataset.message = toast.message;

    let bg = 'bg-[var(--vyre-card)]';
    let border = 'border-[var(--vyre-border-light)]';
    let icon = `<svg class="w-4 h-4 text-[var(--vyre-primary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    if (toast.variant === 'error') {
      border = 'border-[var(--vyre-danger)]';
      icon = `<svg class="w-4 h-4 text-[var(--vyre-danger)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (toast.variant === 'success') {
      border = 'border-[var(--vyre-success)]';
      icon = `<svg class="w-4 h-4 text-[var(--vyre-success)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    }

    el.className = `flex items-start sm:items-center gap-3 ${bg} border ${border} text-white px-4 py-3 rounded-2xl sm:rounded-full text-[13px] font-medium transition-all duration-300 ease-out translate-y-8 opacity-0 shadow-xl max-w-sm pointer-events-auto`;
    el.innerHTML = `${icon}<span class="leading-relaxed whitespace-pre-wrap">${toast.message}</span>`;

    this.container.appendChild(el);
    this.activeToast = el;

    // Fade in
    requestAnimationFrame(() => {
      // Small delay ensures transition triggers
      setTimeout(() => {
        el.classList.remove('translate-y-8', 'opacity-0');
        this.isAnimating = false;
      }, 10);
    });

    // Auto dismiss
    setTimeout(() => {
      this.dismiss(el);
    }, toast.variant === 'error' ? 4000 : 2500);
  }

  private dismiss(el: HTMLElement) {
    el.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
      if (el.parentNode) el.remove();
      if (this.activeToast === el) {
        this.activeToast = null;
        this.processQueue();
      }
    }, 300);
  }
}

const toastManager = new ToastManager();

function showToast(message: string, variant: 'info' | 'success' | 'error' = 'info') {
  toastManager.show(message, variant);
}
