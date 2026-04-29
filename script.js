/* ══════════════════════════════════════════════════════
   script.js — Inkwell Personal Blog
   All data is stored in localStorage (acts as backend).
   Sections:
     1. Data Layer (CRUD helpers)
     2. Seed Data (admin account + demo posts)
     3. Utility Functions
     4. Navigation / SPA Routing
     5. Authentication (login, register, logout)
     6. Blog Home (grid, search, quick-like)
     7. Single Post (open, like, comments)
     8. Dashboard
     9. Create Post
    10. Edit / Delete Posts
    11. Admin Panel
    12. Contact Page
    13. Init
══════════════════════════════════════════════════════ */

/* ══════════════════════════════
   1. DATA LAYER (localStorage)
══════════════════════════════ */
const DB = {
  get: (k) => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const getUsers    = ()  => DB.get('ik_users')    || [];
const saveUsers   = (u) => DB.set('ik_users', u);
const getPosts    = ()  => DB.get('ik_posts')    || [];
const savePosts   = (p) => DB.set('ik_posts', p);
const getMessages = ()  => DB.get('ik_messages') || [];
const saveMessages = (m) => DB.set('ik_messages', m);
const getSession  = ()  => DB.get('ik_session');
const saveSession = (s) => DB.set('ik_session', s);
const clearSession = ()  => localStorage.removeItem('ik_session');

/* ══════════════════════════════
   2. SEED DATA
══════════════════════════════ */

/** Create default admin account on first run */
function seedAdmin() {
  const users = getUsers();
  if (!users.find((u) => u.email === 'admin@inkwell.com')) {
    users.push({
      id: 'admin',
      name: 'Admin',
      email: 'admin@inkwell.com',
      password: 'admin123',
      role: 'admin',
      joined: new Date().toISOString(),
    });
    saveUsers(users);
  }
}

/** Populate three demo posts on first run */
function seedPosts() {
  if (getPosts().length === 0) {
    const demoPosts = [
      {
        id: uid(),
        title: 'The Art of Slow Travel',
        category: 'Travel',
        content:
          'Slow travel is about immersing yourself in a place rather than rushing from highlight to highlight.\n\n' +
          'When you stay somewhere for weeks instead of days, you learn the rhythm of its mornings, the sounds of its evenings, ' +
          'and the texture of its everyday life. You find the bakery the locals love, not the one in the guidebook.\n\n' +
          'This kind of travel demands patience but rewards it generously.',
        author: 'Admin',
        authorId: 'admin',
        date: new Date().toISOString(),
        likes: ['demo'],
        comments: [],
        image: null,
      },
      {
        id: uid(),
        title: 'Why I Started Writing Every Morning',
        category: 'Life',
        content:
          'Three years ago, I set an alarm for 5:30 AM. Not to exercise. Not to meditate. To write.\n\n' +
          'I had no idea what I was doing. I just knew something in me needed to get out onto the page ' +
          'before the noise of the day drowned it out.\n\n' +
          'Those early pages were terrible. Stream-of-consciousness rambling, grocery lists mixed with existential questions. ' +
          'But slowly, slowly, something started to take shape.',
        author: 'Admin',
        authorId: 'admin',
        date: new Date().toISOString(),
        likes: [],
        comments: [],
        image: null,
      },
      {
        id: uid(),
        title: "A Beginner's Guide to Film Photography",
        category: 'Photography',
        content:
          "There is something magical about not knowing what you've captured until days later, when the film comes back from the lab.\n\n" +
          'Film photography forces you to slow down. Each frame costs money and thought. ' +
          'You consider composition, light, and moment before pressing the shutter.\n\n' +
          "The best cameras to start with are simple 35mm point-and-shoots. They're forgiving, cheap to find second-hand, and produce gorgeous results.",
        author: 'Admin',
        authorId: 'admin',
        date: new Date().toISOString(),
        likes: [],
        comments: [],
        image: null,
      },
    ];
    savePosts(demoPosts);
  }
}

/* ══════════════════════════════
   3. UTILITY FUNCTIONS
══════════════════════════════ */

/** Generate a short unique ID */
function uid() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/** Format an ISO date string into a readable date */
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Show a temporary toast notification */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/** Show an inline alert inside a container element */
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => (el.innerHTML = ''), 3500);
}

/* ══════════════════════════════
   4. NAVIGATION / SPA ROUTING
══════════════════════════════ */

/** Switch to a named page */
function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);
  updateNav();

  // Trigger page-specific rendering
  if (name === 'home')      renderBlogGrid(getPosts());
  if (name === 'dashboard') renderDashboard();
  if (name === 'admin')     renderAdmin();
}

/** Logo click — go home */
function goHome() { showPage('home'); }

/** Smooth-scroll to the posts grid */
function scrollToPosts() {
  document.getElementById('posts-section').scrollIntoView({ behavior: 'smooth' });
}

/** Update nav buttons based on login state */
function updateNav() {
  const loggedIn = !!currentUser;
  const isAdmin  = currentUser?.role === 'admin';

  document.getElementById('nav-user').textContent           = loggedIn ? currentUser.name : '';
  document.getElementById('nb-login').style.display         = loggedIn ? 'none' : '';
  document.getElementById('nb-register').style.display      = loggedIn ? 'none' : '';
  document.getElementById('nb-logout').style.display        = loggedIn ? '' : 'none';
  document.getElementById('nb-dash').style.display          = loggedIn ? '' : 'none';
  document.getElementById('nb-create').style.display        = loggedIn ? '' : 'none';
  document.getElementById('nb-admin').style.display         = isAdmin  ? '' : 'none';
}

/* ══════════════════════════════
   5. AUTHENTICATION
══════════════════════════════ */

/** Login handler */
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) return showAlert('login-alert', 'Please fill in all fields.');

  const user = getUsers().find((u) => u.email === email && u.password === pass);
  if (!user) return showAlert('login-alert', 'Invalid email or password.');

  currentUser = user;
  saveSession(user);
  updateNav();
  toast('Welcome back, ' + user.name + '!');
  showPage('dashboard');
}

/** Register handler */
function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;

  if (!name || !email || !pass) return showAlert('reg-alert', 'Please fill in all fields.');
  if (pass.length < 6) return showAlert('reg-alert', 'Password must be at least 6 characters.');

  const users = getUsers();
  if (users.find((u) => u.email === email))
    return showAlert('reg-alert', 'An account with this email already exists.');

  const user = {
    id: uid(),
    name,
    email,
    password: pass,
    role: 'user',
    joined: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);

  currentUser = user;
  saveSession(user);
  updateNav();
  toast('Account created! Welcome, ' + name + '!');
  showPage('dashboard');
}

/** Logout handler */
function logout() {
  currentUser = null;
  clearSession();
  updateNav();
  toast('Logged out. See you soon!');
  showPage('home');
}

/* ══════════════════════════════
   6. BLOG HOME — grid, search, quick-like
══════════════════════════════ */

/** Render the blog grid with an array of posts */
function renderBlogGrid(posts) {
  const grid = document.getElementById('blog-grid');
  if (!posts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="emoji">📭</div><p>No posts found.</p>
    </div>`;
    return;
  }
  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  grid.innerHTML = sorted.map((p) => cardHTML(p)).join('');
}

/** Build HTML for a single blog card */
function cardHTML(p) {
  const liked  = currentUser && p.likes.includes(currentUser.id);
  const imgTag = p.image
    ? `<img class="blog-card-img" src="${p.image}" alt="${p.title}" />`
    : `<div class="blog-card-img-placeholder">📝</div>`;

  return `
    <div class="blog-card" onclick="openPost('${p.id}')">
      ${imgTag}
      <div class="blog-card-body">
        <div class="blog-card-cat">${p.category || 'General'}</div>
        <div class="blog-card-title">${p.title}</div>
        <div class="blog-card-excerpt">${p.content}</div>
        <div class="blog-card-meta">
          <span class="blog-card-author">By ${p.author}</span>
          <div class="blog-card-actions">
            <button class="like-btn ${liked ? 'liked' : ''}" onclick="quickLike(event,'${p.id}')">
              ♥ ${p.likes.length}
            </button>
            <span>💬 ${p.comments.length}</span>
            <span style="color:var(--muted)">${fmtDate(p.date)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

/** Filter posts by search query */
function filterPosts() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const posts = getPosts().filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q)
  );
  renderBlogGrid(posts);
}

/** Toggle like directly from the card (without opening the post) */
function quickLike(e, id) {
  e.stopPropagation();
  if (!currentUser) { toast('Please log in to like posts.'); return; }

  const posts = getPosts();
  const post  = posts.find((p) => p.id === id);
  if (!post) return;

  if (post.likes.includes(currentUser.id)) {
    post.likes = post.likes.filter((l) => l !== currentUser.id);
  } else {
    post.likes.push(currentUser.id);
  }
  savePosts(posts);
  filterPosts(); // re-render with current search state
}

/* ══════════════════════════════
   7. SINGLE POST VIEW
══════════════════════════════ */

/** Open the full post page for a given post ID */
function openPost(id) {
  currentPostId = id;
  const post = getPosts().find((p) => p.id === id);
  if (!post) return;

  document.getElementById('sp-cat').textContent   = post.category || 'General';
  document.getElementById('sp-title').textContent = post.title;
  document.getElementById('sp-author').textContent = post.author;
  document.getElementById('sp-date').textContent  = fmtDate(post.date);
  document.getElementById('sp-content').textContent = post.content;
  document.getElementById('sp-likes').textContent = post.likes.length;
  document.getElementById('sp-comment-count').textContent =
    post.comments.length + ' comment' + (post.comments.length !== 1 ? 's' : '');

  // Cover image
  const img = document.getElementById('sp-img');
  if (post.image) { img.src = post.image; img.style.display = 'block'; }
  else            { img.style.display = 'none'; }

  // Like button colour
  const liked = currentUser && post.likes.includes(currentUser.id);
  document.getElementById('sp-like-btn').style.background = liked ? '#c53030' : '#e53e3e';

  renderComments(post);
  document.getElementById('comment-form-wrap').style.display = currentUser ? '' : 'none';
  showPage('post');
}

/** Toggle like on the open post */
function likePost() {
  if (!currentUser) { toast('Please log in to like posts.'); return; }

  const posts = getPosts();
  const post  = posts.find((p) => p.id === currentPostId);
  if (!post) return;

  if (post.likes.includes(currentUser.id)) {
    post.likes = post.likes.filter((l) => l !== currentUser.id);
  } else {
    post.likes.push(currentUser.id);
  }
  savePosts(posts);

  document.getElementById('sp-likes').textContent = post.likes.length;
  const liked = post.likes.includes(currentUser.id);
  document.getElementById('sp-like-btn').style.background = liked ? '#c53030' : '#e53e3e';
  toast(liked ? 'Post liked!' : 'Like removed.');
}

/** Render comments list for a post object */
function renderComments(post) {
  const el = document.getElementById('sp-comments');
  if (!post.comments.length) {
    el.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;margin-bottom:1rem;">No comments yet. Be the first!</p>`;
    return;
  }
  el.innerHTML = post.comments
    .map(
      (c) => `
      <div class="comment-item">
        <div class="comment-author">${c.author}</div>
        <div class="comment-text">${c.text}</div>
        <div class="comment-date">${fmtDate(c.date)}</div>
      </div>`
    )
    .join('');
}

/** Post a new comment on the currently open post */
function addComment() {
  if (!currentUser) { toast('Please log in to comment.'); return; }

  const text = document.getElementById('comment-input').value.trim();
  if (!text) return toast('Please write a comment first.');

  const posts = getPosts();
  const post  = posts.find((p) => p.id === currentPostId);
  if (!post) return;

  post.comments.push({
    id: uid(),
    author: currentUser.name,
    authorId: currentUser.id,
    text,
    date: new Date().toISOString(),
  });
  savePosts(posts);

  document.getElementById('comment-input').value = '';
  document.getElementById('sp-comment-count').textContent =
    post.comments.length + ' comment' + (post.comments.length !== 1 ? 's' : '');
  renderComments(post);
  toast('Comment posted!');
}

/* ══════════════════════════════
   8. DASHBOARD
══════════════════════════════ */

/** Render user dashboard with stats and their own posts */
function renderDashboard() {
  if (!currentUser) { showPage('login'); return; }

  document.getElementById('dash-greeting').textContent = 'Hello, ' + currentUser.name + '!';

  const posts         = getPosts();
  const myPosts       = posts.filter((p) => p.authorId === currentUser.id);
  const totalLikes    = myPosts.reduce((s, p) => s + p.likes.length, 0);
  const totalComments = myPosts.reduce((s, p) => s + p.comments.length, 0);

  // Stat cards
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${myPosts.length}</div><div class="stat-label">Posts</div></div>
    <div class="stat-card"><div class="stat-num">${totalLikes}</div><div class="stat-label">Total Likes</div></div>
    <div class="stat-card"><div class="stat-num">${totalComments}</div><div class="stat-label">Comments</div></div>
    <div class="stat-card"><div class="stat-num">${posts.length}</div><div class="stat-label">Total Posts</div></div>
  `;

  // My posts grid
  const grid = document.getElementById('my-posts-grid');
  if (!myPosts.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="emoji">✍️</div>
        <p>You haven't written any posts yet.<br>
        <a href="#" onclick="showPage('create')" style="color:var(--rust);font-weight:600;">Write your first post →</a></p>
      </div>`;
    return;
  }

  grid.innerHTML = [...myPosts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (p) => `
      <div class="blog-card">
        ${
          p.image
            ? `<img class="blog-card-img" src="${p.image}" alt="${p.title}" onclick="openPost('${p.id}')" />`
            : `<div class="blog-card-img-placeholder" onclick="openPost('${p.id}')">📝</div>`
        }
        <div class="blog-card-body">
          <div class="blog-card-cat">${p.category || 'General'}</div>
          <div class="blog-card-title" style="cursor:pointer" onclick="openPost('${p.id}')">${p.title}</div>
          <div class="blog-card-meta" style="margin-top:0.75rem">
            <span>♥ ${p.likes.length} · 💬 ${p.comments.length}</span>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-sm btn-sage"   onclick="openEditModal('${p.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deletePost('${p.id}','dashboard')">Delete</button>
            </div>
          </div>
        </div>
      </div>`
    )
    .join('');
}

/* ══════════════════════════════
   9. CREATE POST
══════════════════════════════ */
let pendingImageData = null; // stores base64 image before publishing

/** Preview selected cover image */
function previewImg() {
  const file = document.getElementById('post-img').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    pendingImageData = e.target.result;
    document.getElementById('img-preview-container').innerHTML =
      `<img src="${pendingImageData}" alt="preview" style="max-width:100%;max-height:200px;border-radius:6px;border:1px solid var(--border);margin-top:0.5rem" />`;
  };
  reader.readAsDataURL(file);
}

/** Publish a new post */
function publishPost() {
  if (!currentUser) { showPage('login'); return; }

  const title   = document.getElementById('post-title').value.trim();
  const cat     = document.getElementById('post-cat').value.trim();
  const content = document.getElementById('post-content').value.trim();

  if (!title || !content) return showAlert('create-alert', 'Title and content are required.');

  const posts = getPosts();
  posts.push({
    id: uid(),
    title,
    category: cat || 'General',
    content,
    image: pendingImageData || null,
    author: currentUser.name,
    authorId: currentUser.id,
    date: new Date().toISOString(),
    likes: [],
    comments: [],
  });
  savePosts(posts);

  // Reset form
  document.getElementById('post-title').value = '';
  document.getElementById('post-cat').value   = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-img').value   = '';
  document.getElementById('img-preview-container').innerHTML = '';
  pendingImageData = null;

  toast('Post published!');
  showPage('dashboard');
}

/* ══════════════════════════════
   10. EDIT / DELETE POSTS
══════════════════════════════ */

/** Open the edit modal pre-filled with post data */
function openEditModal(id) {
  const post = getPosts().find((p) => p.id === id);
  if (!post) return;

  document.getElementById('edit-post-id').value   = id;
  document.getElementById('edit-title').value     = post.title;
  document.getElementById('edit-category').value  = post.category || '';
  document.getElementById('edit-content').value   = post.content;
  document.getElementById('edit-modal').classList.add('open');
}

/** Close the edit modal */
function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

/** Save edited post data */
function saveEdit() {
  const id    = document.getElementById('edit-post-id').value;
  const posts = getPosts();
  const post  = posts.find((p) => p.id === id);
  if (!post) return;

  post.title    = document.getElementById('edit-title').value.trim()    || post.title;
  post.category = document.getElementById('edit-category').value.trim() || post.category;
  post.content  = document.getElementById('edit-content').value.trim()  || post.content;
  savePosts(posts);

  closeEditModal();
  toast('Post updated!');

  // Refresh whichever page is currently visible
  const active = document.querySelector('.page.active');
  if (active.id === 'page-dashboard') renderDashboard();
  if (active.id === 'page-admin')     renderAdmin();
}

/** Delete a post by ID */
function deletePost(id, returnPage) {
  if (!confirm('Delete this post?')) return;
  savePosts(getPosts().filter((p) => p.id !== id));
  toast('Post deleted.');
  if (returnPage === 'dashboard') renderDashboard();
  else renderAdmin();
}

/* ══════════════════════════════
   11. ADMIN PANEL
══════════════════════════════ */
let currentAdminTab = 'posts';

/** Switch admin tabs (Posts / Users / Messages) */
function adminTab(tab, btn) {
  currentAdminTab = tab;
  document.querySelectorAll('.tab-bar .tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('admin-posts-tab').style.display    = tab === 'posts'    ? '' : 'none';
  document.getElementById('admin-users-tab').style.display    = tab === 'users'    ? '' : 'none';
  document.getElementById('admin-messages-tab').style.display = tab === 'messages' ? '' : 'none';

  renderAdmin();
}

/** Render all admin panel tabs */
function renderAdmin() {
  if (!currentUser || currentUser.role !== 'admin') { showPage('home'); return; }

  /* --- Posts table --- */
  const posts = [...getPosts()].sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById('admin-posts-tbody').innerHTML = posts.length
    ? posts
        .map(
          (p) => `
          <tr>
            <td><span class="post-name" title="${p.title}">${p.title}</span></td>
            <td>${p.author}</td>
            <td>${p.category || 'General'}</td>
            <td>♥ ${p.likes.length}</td>
            <td>${fmtDate(p.date)}</td>
            <td>
              <button class="btn btn-sm btn-sage"   onclick="openEditModal('${p.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deletePost('${p.id}','admin')" style="margin-left:4px">Delete</button>
            </td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">No posts yet.</td></tr>`;

  /* --- Users table --- */
  const allPosts = getPosts();
  document.getElementById('admin-users-tbody').innerHTML = getUsers()
    .map(
      (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="user-badge ${u.role}">${u.role}</span></td>
        <td>${allPosts.filter((p) => p.authorId === u.id).length}</td>
        <td>${fmtDate(u.joined)}</td>
      </tr>`
    )
    .join('');

  /* --- Messages list --- */
  const messages = getMessages();
  const mlist    = document.getElementById('admin-messages-list');
  if (!messages.length) {
    mlist.innerHTML = `<div class="empty-state"><div class="emoji">📭</div><p>No messages yet.</p></div>`;
  } else {
    mlist.innerHTML = [...messages]
      .reverse()
      .map(
        (m) => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:1.2rem;margin-bottom:1rem;border-left:4px solid var(--gold)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem">
            <div>
              <strong style="font-size:0.95rem">${m.name}</strong>
              <span style="color:var(--muted);font-size:0.8rem"> — ${m.email}</span>
            </div>
            <span style="font-size:0.75rem;color:var(--muted)">${fmtDate(m.date)}</span>
          </div>
          <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.4rem;color:var(--rust)">${m.subject}</div>
          <div style="font-size:0.88rem;line-height:1.6;color:var(--ink)">${m.message}</div>
        </div>`
      )
      .join('');
  }
}

/* ══════════════════════════════
   12. CONTACT PAGE
══════════════════════════════ */

/** Send a contact message (saved to localStorage for admin) */
function sendContact() {
  const name    = document.getElementById('c-name').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const subject = document.getElementById('c-subject').value.trim();
  const message = document.getElementById('c-msg').value.trim();

  if (!name || !email || !message)
    return showAlert('contact-alert', 'Please fill in all required fields.');

  const msgs = getMessages();
  msgs.push({
    id: uid(),
    name,
    email,
    subject: subject || '(no subject)',
    message,
    date: new Date().toISOString(),
  });
  saveMessages(msgs);

  // Clear form
  document.getElementById('c-name').value    = '';
  document.getElementById('c-email').value   = '';
  document.getElementById('c-subject').value = '';
  document.getElementById('c-msg').value     = '';

  showAlert('contact-alert', "✓ Message sent! We'll get back to you soon.", 'success');
  toast('Message sent!');
}

/* ══════════════════════════════
   13. INIT
══════════════════════════════ */
let currentUser   = null; // currently logged-in user object
let currentPostId = null; // ID of the post currently being viewed

window.onload = () => {
  // Seed default data
  seedAdmin();
  seedPosts();

  // Restore session
  currentUser = getSession();
  updateNav();

  // Render home grid
  renderBlogGrid(getPosts());
};
