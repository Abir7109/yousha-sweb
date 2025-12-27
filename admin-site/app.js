const API_BASE =
  document.querySelector('meta[name="yousha-api-base"]')?.content?.trim() || '';

if (!API_BASE) {
  console.warn('No API base configured in <meta name="yousha-api-base">; using local demo login.');
}

let token = null;

// Elements
const loginView = document.getElementById('loginView');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const heroForm = document.getElementById('heroForm');
const heroKicker = document.getElementById('heroKicker');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const heroStatus = document.getElementById('heroStatus');

const photoForm = document.getElementById('photoForm');
const photoFile = document.getElementById('photoFile');
const photoTitle = document.getElementById('photoTitle');
const photoCaption = document.getElementById('photoCaption');
const photoStatus = document.getElementById('photoStatus');
const photoList = document.getElementById('photoList');

const musicForm = document.getElementById('musicForm');
const musicFile = document.getElementById('musicFile');
const musicTitle = document.getElementById('musicTitle');
const musicStatus = document.getElementById('musicStatus');
const musicList = document.getElementById('musicList');

// --- Token helpers ---
function setToken(value) {
  token = value;
  if (value) {
    sessionStorage.setItem('yousha-admin-token', value);
  } else {
    sessionStorage.removeItem('yousha-admin-token');
  }
}

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Request failed');
  }
  return body;
}

// --- UI state ---
function showDashboard() {
  loginView.classList.add('hidden');
  dashboard.classList.remove('hidden');
  loadAllData();
}

function showLogin() {
  loginView.classList.remove('hidden');
  dashboard.classList.add('hidden');
  setToken(null);
}

// --- Auth flow ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // If no API base is set, allow a local demo login so you can see the UI
  // without the backend. This does NOT affect the real deployed admin.
  if (!API_BASE) {
    if (email === 'rahikulmakhtum147@gmail.com' && password === 'abir123') {
      setToken('local-demo-token');
      showDashboard();
    } else {
      loginError.textContent = 'Invalid local demo credentials.';
    }
    return;
  }

  try {
    const data = await jsonFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message || 'Login failed';
  }
});

logoutBtn.addEventListener('click', () => {
  showLogin();
});

// --- Load data ---
async function loadConfig() {
  heroStatus.textContent = 'Loading...';
  try {
    const cfg = await fetch(`${API_BASE}/api/public/config`).then((r) => r.json());
    heroKicker.value = cfg.heroKicker || '';
    heroTitle.value = cfg.heroTitle || '';
    heroSubtitle.value = cfg.heroSubtitle || '';
    heroStatus.textContent = 'Loaded';
  } catch {
    heroStatus.textContent = 'Could not load config';
  }
}

async function loadPhotos() {
  photoList.textContent = 'Loading...';
  try {
    const list = await fetch(`${API_BASE}/api/public/photos`).then((r) => r.json());
    if (!Array.isArray(list) || list.length === 0) {
      photoList.textContent = 'No photos yet.';
      return;
    }

    photoList.innerHTML = '';
    list.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'list-item';

      const left = document.createElement('div');
      left.className = 'list-item-left';

      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = p.imageUrl;
      img.alt = p.title || 'Photo';

      const meta = document.createElement('div');
      const t = document.createElement('div');
      t.className = 'item-title';
      t.textContent = p.title || 'Untitled';

      const cap = document.createElement('div');
      cap.className = 'item-meta';
      cap.textContent = p.caption || '';

      meta.appendChild(t);
      meta.appendChild(cap);

      left.appendChild(img);
      left.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'list-actions';

      const del = document.createElement('button');
      del.className = 'btn ghost';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        if (!confirm('Delete this photo?')) return;
        await fetch(`${API_BASE}/api/admin/photos/${p.id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        loadPhotos();
      });

      actions.appendChild(del);

      row.appendChild(left);
      row.appendChild(actions);
      photoList.appendChild(row);
    });
  } catch {
    photoList.textContent = 'Error loading photos';
  }
}

async function loadMusic() {
  musicList.textContent = 'Loading...';
  try {
    const list = await fetch(`${API_BASE}/api/admin/music`, {
      headers: authHeaders(),
    }).then((r) => r.json());

    if (!Array.isArray(list) || list.length === 0) {
      musicList.textContent = 'No tracks yet.';
      return;
    }

    musicList.innerHTML = '';
    list.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'list-item';

      const left = document.createElement('div');
      left.className = 'list-item-left';

      const icon = document.createElement('div');
      icon.className = 'thumb';
      icon.style.display = 'grid';
      icon.style.placeItems = 'center';
      icon.textContent = '🎵';

      const meta = document.createElement('div');
      const t = document.createElement('div');
      t.className = 'item-title';
      t.textContent = m.title || 'Track';
      const small = document.createElement('div');
      small.className = 'item-meta';
      small.textContent = new Date(m.createdAt).toLocaleString();

      meta.appendChild(t);
      meta.appendChild(small);

      left.appendChild(icon);
      left.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'list-actions';

      const del = document.createElement('button');
      del.className = 'btn ghost';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        if (!confirm('Delete this track?')) return;
        await fetch(`${API_BASE}/api/admin/music/${m._id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        loadMusic();
      });

      actions.appendChild(del);

      row.appendChild(left);
      row.appendChild(actions);
      musicList.appendChild(row);
    });
  } catch {
    musicList.textContent = 'Error loading music';
  }
}

async function loadAllData() {
  await Promise.allSettled([loadConfig(), loadPhotos(), loadMusic()]);
}

// --- Save hero ---
heroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  heroStatus.textContent = 'Saving...';

  try {
    await fetch(`${API_BASE}/api/admin/config`, {
      method: 'PUT',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        heroKicker: heroKicker.value,
        heroTitle: heroTitle.value,
        heroSubtitle: heroSubtitle.value,
      }),
    });
    heroStatus.textContent = 'Saved ✓';
  } catch {
    heroStatus.textContent = 'Failed to save';
  }
});

// --- Upload photo ---
photoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!photoFile.files.length) return;

  const files = Array.from(photoFile.files);
  const total = files.length;
  let success = 0;
  let failed = 0;

  photoStatus.textContent = `Uploading ${total} photo${total > 1 ? 's' : ''}...`;

  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    if (photoTitle.value.trim()) form.append('title', photoTitle.value.trim());
    if (photoCaption.value.trim()) form.append('caption', photoCaption.value.trim());

    try {
      const res = await fetch(`${API_BASE}/api/admin/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      success += 1;
    } catch {
      failed += 1;
    }
  }

  if (failed === 0) {
    photoStatus.textContent = `Uploaded ${success} photo${success > 1 ? 's' : ''} ✓`;
  } else if (success === 0) {
    photoStatus.textContent = 'All uploads failed';
  } else {
    photoStatus.textContent = `Uploaded ${success}, failed ${failed}`;
  }

  photoForm.reset();
  loadPhotos();
});

// --- Upload music ---
musicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!musicFile.files[0]) return;
  musicStatus.textContent = 'Uploading...';

  const form = new FormData();
  form.append('file', musicFile.files[0]);
  if (musicTitle.value.trim()) form.append('title', musicTitle.value.trim());

  try {
    await fetch(`${API_BASE}/api/admin/music`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    musicStatus.textContent = 'Uploaded ✓';
    musicForm.reset();
    loadMusic();
  } catch {
    musicStatus.textContent = 'Upload failed';
  }
});

// --- Restore token on reload ---
const stored = sessionStorage.getItem('yousha-admin-token');
if (stored) {
  setToken(stored);
  showDashboard();
}
