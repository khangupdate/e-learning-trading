// ============================================
// MAIN.JS — App Controller (Student + Admin)
// ============================================
import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import * as svc from "./firebase-service.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initAdmin } from "./admin.js";

// -------- State --------
export const state = {
  user: null,       // { uid, name, email, role }
  course: null,     // current course object
  lesson: null,     // current lesson object
  lessons: [],      // lessons of current course
  allCourses: [],
};

// -------- Toast --------
export function showToast(msg, type = 'info') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = '200ms'; }, 2800);
  setTimeout(() => t.remove(), 3000);
}

// -------- Page Router --------
export function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
}

// -------- Modal helpers --------
export function openModal(id) { document.getElementById(id)?.classList.add('open'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
window.closeModal = closeModal;

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// -------- Auth State --------
onAuthStateChanged(auth, async (fbUser) => {
  if (fbUser) {
    const userDoc = await svc.getUserDoc(fbUser.uid);
    if (!userDoc) { await svc.logoutUser(); return; }
    state.user = userDoc;
    setupNavForUser();
    if (state.user.role === 'admin' || state.user.email === ADMIN_EMAIL) {
      showPage('admin');
      initAdmin();
    } else {
      showPage('dashboard');
      await renderDashboard();
    }
  } else {
    state.user = null;
    showPage('auth');
    setupNavForGuest();
  }
});

// -------- Nav --------
function setupNavForUser() {
  document.getElementById('nav-links').style.display = 'flex';
  const navUser = document.getElementById('nav-user');
  navUser.style.display = 'flex';
  document.getElementById('nav-user-name').textContent = state.user.name;
  document.getElementById('nav-avatar').textContent = state.user.name.charAt(0).toUpperCase();

  const isAdmin = state.user.role === 'admin' || state.user.email === ADMIN_EMAIL;
  document.getElementById('dd-admin').style.display = isAdmin ? 'flex' : 'none';
}

function setupNavForGuest() {
  document.getElementById('nav-links').style.display = 'none';
  document.getElementById('nav-user').style.display = 'none';
}

// Nav dropdown toggle
document.getElementById('nav-user-info').addEventListener('click', () => {
  document.getElementById('user-dropdown').classList.toggle('open');
});
document.addEventListener('click', e => {
  const info = document.getElementById('nav-user-info');
  const dd = document.getElementById('user-dropdown');
  if (dd && info && !info.contains(e.target)) dd.classList.remove('open');
});

// Nav links
document.getElementById('nav-logo-btn').addEventListener('click', e => {
  e.preventDefault();
  if (state.user) {
    if (state.user.role === 'admin' || state.user.email === ADMIN_EMAIL) showPage('admin');
    else showPage('dashboard');
  }
});
document.getElementById('nav-courses-btn').addEventListener('click', e => { e.preventDefault(); showPage('dashboard'); renderDashboard(); });
document.getElementById('nav-profile-btn').addEventListener('click', e => { e.preventDefault(); showPage('profile'); renderProfile(); });
document.getElementById('dd-profile').addEventListener('click', e => { e.preventDefault(); showPage('profile'); renderProfile(); document.getElementById('user-dropdown').classList.remove('open'); });
document.getElementById('dd-admin').addEventListener('click', e => { e.preventDefault(); showPage('admin'); initAdmin(); document.getElementById('user-dropdown').classList.remove('open'); });
document.getElementById('dd-logout').addEventListener('click', async e => { e.preventDefault(); await svc.logoutUser(); });

// -------- AUTH FORM --------
document.getElementById('toggle-pw').addEventListener('click', () => {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.textContent = 'Đang đăng nhập...';
  btn.disabled = true;
  errEl.textContent = '';

  try {
    await svc.loginUser(email, password);
    // onAuthStateChanged will handle redirect
  } catch (err) {
    errEl.textContent = 'Email hoặc mật khẩu không đúng';
    btn.textContent = 'Đăng nhập';
    btn.disabled = false;
  }
});

// -------- DASHBOARD --------
export async function renderDashboard() {
  const grid = document.getElementById('courses-grid');
  grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="caption text-slate">Đang tải...</p></div>';

  try {
    const courses = await svc.getCourses();
    state.allCourses = courses;

    // Load progress for all courses
    const progressArr = await svc.getAllProgressForUser(state.user.uid);
    const progressMap = {};
    progressArr.forEach(p => { progressMap[p.courseId] = p.completedLessons || []; });

    let totalDone = 0, totalLessons = 0;
    courses.forEach(c => {
      const done = (progressMap[c.id] || []).length;
      totalDone += done;
      totalLessons += (c.totalLessons || 0);
    });

    document.getElementById('dashboard-greeting').textContent = `Xin chào, ${state.user.name} 👋`;
    document.getElementById('stat-lessons').textContent = totalDone;
    document.getElementById('stat-courses').textContent = courses.length;
    document.getElementById('stat-pct').textContent = totalLessons ? Math.round(totalDone / totalLessons * 100) + '%' : '0%';
    document.getElementById('nav-avatar').textContent = state.user.name.charAt(0).toUpperCase();

    if (courses.length === 0) {
      grid.innerHTML = '<p class="caption text-slate" style="text-align:center;padding:48px 0;">Chưa có khóa học nào. Admin sẽ thêm sớm!</p>';
      return;
    }

    grid.innerHTML = courses.map(course => {
      const done = (progressMap[course.id] || []).length;
      const total = course.totalLessons || 0;
      const pct = total ? Math.round(done / total * 100) : 0;
      const thumb = course.thumbnail || `https://img.youtube.com/vi/default/maxresdefault.jpg`;
      return `
        <div class="card course-card" data-course-id="${course.id}">
          <div class="course-thumb">
            <img src="${thumb}" alt="${course.title}" onerror="this.src='https://via.placeholder.com/480x270/222126/F0B90B?text=Course'">
            <span class="badge badge-yellow" style="position:absolute;top:12px;left:12px;">${course.level || 'Cơ bản'}</span>
          </div>
          <div class="course-body">
            <p class="caption text-slate" style="margin-bottom:6px;">${course.category || ''}</p>
            <h3 class="heading-4" style="margin-bottom:8px;line-height:1.4;">${course.title}</h3>
            <p class="caption text-slate" style="margin-bottom:16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${course.description || ''}</p>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span class="caption text-slate">${done}/${total} bài học</span>
              <span class="caption text-yellow" style="font-weight:600;">${pct}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.course-card').forEach(card => {
      card.addEventListener('click', () => openCoursePage(card.dataset.courseId));
    });
  } catch (err) {
    grid.innerHTML = '<p class="caption text-red" style="text-align:center;padding:32px;">Lỗi tải dữ liệu. Vui lòng thử lại.</p>';
    console.error(err);
  }
}

// -------- COURSE PAGE --------
export async function openCoursePage(courseId) {
  showPage('course');
  const course = await svc.getCourse(courseId);
  state.course = course;
  const lessons = await svc.getLessons(courseId);
  state.lessons = lessons;

  const done = await svc.getProgress(state.user.uid, courseId);
  const pct = lessons.length ? Math.round(done.length / lessons.length * 100) : 0;

  document.getElementById('bc-course-title').textContent = course.title;
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-description').textContent = course.description || '';
  document.getElementById('course-instructor').textContent = course.instructor || '';
  document.getElementById('course-total').textContent = `${lessons.length} bài học`;
  document.getElementById('course-progress-pct').textContent = pct + '%';
  document.getElementById('course-progress-bar').style.width = pct + '%';

  const list = document.getElementById('lessons-list');
  if (lessons.length === 0) {
    list.innerHTML = '<p class="caption text-slate" style="padding:24px;text-align:center;">Chưa có bài học nào.</p>';
    return;
  }
  list.innerHTML = lessons.map((l, i) => {
    const isDone = done.includes(l.id);
    return `
      <div class="lesson-item ${isDone ? 'done' : ''}" data-lesson-id="${l.id}">
        <div class="lesson-num">${isDone ? '✓' : i + 1}</div>
        <div class="lesson-info">
          <p class="body" style="font-weight:600;margin-bottom:2px;">${l.title}</p>
          <p class="caption text-slate">${l.duration || ''}</p>
        </div>
        <span class="lesson-arrow">›</span>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.lesson-item').forEach(item => {
    item.addEventListener('click', () => openLessonPage(courseId, item.dataset.lessonId));
  });
}

document.getElementById('bc-dashboard').addEventListener('click', e => { e.preventDefault(); showPage('dashboard'); renderDashboard(); });
document.getElementById('btn-start-course').addEventListener('click', () => {
  if (state.lessons.length > 0) openLessonPage(state.course.id, state.lessons[0].id);
});

// -------- LESSON PAGE --------
export async function openLessonPage(courseId, lessonId) {
  showPage('lesson');
  if (!state.course || state.course.id !== courseId) {
    state.course = await svc.getCourse(courseId);
    state.lessons = await svc.getLessons(courseId);
  }
  const lesson = state.lessons.find(l => l.id === lessonId);
  state.lesson = lesson;

  document.getElementById('lesson-video').src = lesson.youtubeId
    ? `https://www.youtube.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`
    : '';
  document.getElementById('lesson-course-name').textContent = state.course.title;
  document.getElementById('lesson-title').textContent = lesson.title;
  document.getElementById('lesson-description').textContent = lesson.description || '';
  document.getElementById('comment-avatar').textContent = state.user.name.charAt(0).toUpperCase();

  // Mark done button
  const done = await svc.getProgress(state.user.uid, courseId);
  const doneBtn = document.getElementById('btn-mark-done');
  if (done.includes(lessonId)) {
    doneBtn.textContent = '✓ Đã hoàn thành';
    doneBtn.className = 'btn btn-ghost btn-sm';
    doneBtn.disabled = true;
  } else {
    doneBtn.textContent = 'Đánh dấu hoàn thành';
    doneBtn.className = 'btn btn-primary btn-sm';
    doneBtn.disabled = false;
  }

  // Sidebar
  const sidebar = document.getElementById('lesson-sidebar-list');
  sidebar.innerHTML = state.lessons.map((l, i) => {
    const isActive = l.id === lessonId;
    const isDone = done.includes(l.id);
    return `
      <div class="sidebar-lesson ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-lesson-id="${l.id}">
        <div class="sidebar-num">${isDone ? '✓' : i + 1}</div>
        <div>
          <p style="font-size:13px;font-weight:600;line-height:1.3;margin-bottom:2px;">${l.title}</p>
          <p style="font-size:12px;color:var(--slate);">${l.duration || ''}</p>
        </div>
      </div>
    `;
  }).join('');

  sidebar.querySelectorAll('.sidebar-lesson').forEach(item => {
    item.addEventListener('click', () => openLessonPage(courseId, item.dataset.lessonId));
  });

  // Prev / Next
  const idx = state.lessons.findIndex(l => l.id === lessonId);
  const prevBtn = document.getElementById('btn-prev-lesson');
  const nextBtn = document.getElementById('btn-next-lesson');
  prevBtn.style.display = idx > 0 ? '' : 'none';
  nextBtn.style.display = idx < state.lessons.length - 1 ? '' : 'none';
  prevBtn.onclick = () => openLessonPage(courseId, state.lessons[idx - 1].id);
  nextBtn.onclick = () => openLessonPage(courseId, state.lessons[idx + 1].id);

  // Comments
  await renderComments(courseId, lessonId);
}

document.getElementById('btn-back-to-course').addEventListener('click', () => {
  if (state.course) openCoursePage(state.course.id);
  else showPage('dashboard');
});

document.getElementById('btn-mark-done').addEventListener('click', async () => {
  if (!state.lesson || !state.course) return;
  await svc.markLessonDone(state.user.uid, state.course.id, state.lesson.id);
  showToast('🎉 Đã hoàn thành bài học!', 'success');
  await openLessonPage(state.course.id, state.lesson.id);
});

// -------- COMMENTS --------
async function renderComments(courseId, lessonId) {
  const comments = await svc.getComments(courseId, lessonId);
  document.getElementById('comments-count').textContent = comments.length;

  const container = document.getElementById('comments-list');
  if (comments.length === 0) {
    container.innerHTML = '<p class="caption text-slate" style="text-align:center;padding:24px 0;">Chưa có bình luận. Hãy là người đầu tiên!</p>';
    return;
  }

  const isAdmin = state.user.role === 'admin' || state.user.email === ADMIN_EMAIL;
  container.innerHTML = comments.map(c => {
    const timeStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('vi-VN') : 'Vừa xong';
    const canDelete = isAdmin || c.uid === state.user.uid;
    return `
      <div class="comment-item">
        <div class="avatar avatar-md" style="flex-shrink:0;">${c.author?.charAt(0).toUpperCase() || 'U'}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-weight:600;font-size:14px;">${c.author}</span>
              <span class="caption text-slate">${timeStr}</span>
            </div>
            ${canDelete ? `<button class="btn btn-ghost btn-sm" style="padding:2px 8px;color:var(--slate);font-size:12px;" data-comment-id="${c.id}">Xóa</button>` : ''}
          </div>
          <p class="body" style="font-size:14px;line-height:1.6;word-break:break-word;">${escHtml(c.text)}</p>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-comment-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await svc.deleteComment(courseId, lessonId, btn.dataset.commentId);
      await renderComments(courseId, lessonId);
    });
  });
}

document.getElementById('btn-submit-comment').addEventListener('click', async () => {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) { showToast('Vui lòng nhập bình luận', 'error'); return; }
  if (!state.course || !state.lesson) return;
  await svc.addComment(state.course.id, state.lesson.id, state.user.uid, state.user.name, text);
  input.value = '';
  await renderComments(state.course.id, state.lesson.id);
  showToast('Đã đăng bình luận!', 'success');
});

document.getElementById('comment-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) document.getElementById('btn-submit-comment').click();
});

// -------- PROFILE --------
async function renderProfile() {
  document.getElementById('profile-name').textContent = state.user.name;
  document.getElementById('profile-email').textContent = state.user.email;
  document.getElementById('profile-avatar').textContent = state.user.name.charAt(0).toUpperCase();

  const courses = state.allCourses.length ? state.allCourses : await svc.getCourses();
  const progressArr = await svc.getAllProgressForUser(state.user.uid);
  const progressMap = {};
  progressArr.forEach(p => { progressMap[p.courseId] = p.completedLessons || []; });

  const el = document.getElementById('profile-courses');
  el.innerHTML = courses.map(course => {
    const done = (progressMap[course.id] || []).length;
    const total = course.totalLessons || 0;
    const pct = total ? Math.round(done / total * 100) : 0;
    return `
      <div class="card" style="padding:20px;cursor:pointer;" data-course-id="${course.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <p style="font-weight:600;font-size:15px;">${course.title}</p>
          <span class="caption text-yellow" style="font-weight:700;">${pct}%</span>
        </div>
        <p class="caption text-slate" style="margin-bottom:10px;">${done}/${total} bài học hoàn thành</p>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('[data-course-id]').forEach(card => {
    card.addEventListener('click', () => openCoursePage(card.dataset.courseId));
  });
}

document.getElementById('nav-profile-btn').addEventListener('click', e => { e.preventDefault(); showPage('profile'); renderProfile(); });
document.getElementById('profile-logout-btn').addEventListener('click', () => svc.logoutUser());

// -------- UTILS --------
function escHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
