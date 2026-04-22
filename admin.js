// ============================================
// ADMIN.JS — Admin Panel Logic
// Students | Courses | Lessons | Progress
// ============================================
import * as svc from "./firebase-service.js";
import { state, showToast, openModal, closeModal } from "./main.js";
import { showPage } from "./main.js";

// -------- Admin Init --------
export async function initAdmin() {
  setupAdminNav();
  await loadAdminTab('students');
}

// -------- Admin Nav --------
function setupAdminNav() {
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', async e => {
      e.preventDefault();
      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      await loadAdminTab(item.dataset.tab);
    });
  });

  document.getElementById('admin-back-btn').addEventListener('click', () => {
    showPage('dashboard');
    import('./main.js').then(m => m.renderDashboard());
  });
}

async function loadAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`admin-tab-${tab}`)?.classList.add('active');

  if (tab === 'students') await loadStudents();
  if (tab === 'courses') await loadCourses();
  if (tab === 'progress') await loadProgressTab();
}

// ============================================================
// STUDENTS
// ============================================================
async function loadStudents() {
  const wrap = document.getElementById('students-table-wrap');
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="caption text-slate">Đang tải...</p></div>';

  const students = await svc.getAllStudents();
  const nonAdmin = students.filter(s => s.role !== 'admin');

  if (nonAdmin.length === 0) {
    wrap.innerHTML = '<p class="caption text-slate" style="text-align:center;padding:32px;">Chưa có học viên nào.</p>';
  } else {
    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${nonAdmin.map(s => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="avatar avatar-sm">${s.name?.charAt(0).toUpperCase() || 'U'}</div>
                  <span style="font-weight:600;">${s.name}</span>
                </div>
              </td>
              <td class="text-slate">${s.email}</td>
              <td class="text-slate">${s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('vi-VN') : '—'}</td>
              <td>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-ghost btn-sm btn-edit-student" data-uid="${s.uid}" data-name="${s.name}" data-email="${s.email}" style="color:var(--yellow);">Sửa</button>
                  <button class="btn btn-ghost btn-sm btn-del-student" data-uid="${s.uid}" data-name="${s.name}" style="color:var(--red);">Xóa</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Add student button
  document.getElementById('btn-add-student').onclick = () => openAddStudentModal();

  // Edit
  wrap.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', () => openEditStudentModal(btn.dataset.uid, btn.dataset.name, btn.dataset.email));
  });

  // Delete
  wrap.querySelectorAll('.btn-del-student').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(
      `Xóa học viên "${btn.dataset.name}"?`,
      'Tài khoản học viên sẽ bị xóa vĩnh viễn.',
      async () => {
        await svc.deleteStudent(btn.dataset.uid);
        showToast('Đã xóa học viên', 'success');
        await loadStudents();
      }
    ));
  });
}

function openAddStudentModal() {
  document.getElementById('modal-student-title').textContent = 'Thêm học viên';
  document.getElementById('student-edit-uid').value = '';
  document.getElementById('student-name').value = '';
  document.getElementById('student-email').value = '';
  document.getElementById('student-password').value = '';
  document.getElementById('student-email').disabled = false;
  document.getElementById('student-pw-group').style.display = '';
  document.getElementById('btn-student-submit').textContent = 'Tạo tài khoản';
  openModal('modal-student');
}

function openEditStudentModal(uid, name, email) {
  document.getElementById('modal-student-title').textContent = 'Sửa học viên';
  document.getElementById('student-edit-uid').value = uid;
  document.getElementById('student-name').value = name;
  document.getElementById('student-email').value = email;
  document.getElementById('student-email').disabled = true;
  document.getElementById('student-pw-group').style.display = 'none';
  document.getElementById('btn-student-submit').textContent = 'Lưu thay đổi';
  openModal('modal-student');
}

document.getElementById('form-student').addEventListener('submit', async e => {
  e.preventDefault();
  const uid = document.getElementById('student-edit-uid').value;
  const name = document.getElementById('student-name').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const password = document.getElementById('student-password').value;
  const btn = document.getElementById('btn-student-submit');

  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    if (uid) {
      // Edit: only update name
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const { db } = await import("./firebase-config.js");
      await updateDoc(doc(db, "users", uid), { name });
      showToast('Đã cập nhật thông tin', 'success');
    } else {
      if (!password || password.length < 6) { showToast('Mật khẩu tối thiểu 6 ký tự', 'error'); return; }
      await svc.createStudent(name, email, password);
      showToast(`Đã tạo tài khoản cho ${name}`, 'success');
    }
    closeModal('modal-student');
    await loadStudents();
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') showToast('Email đã được sử dụng', 'error');
    else showToast('Lỗi: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = uid ? 'Lưu thay đổi' : 'Tạo tài khoản';
  }
});

// ============================================================
// COURSES
// ============================================================
async function loadCourses() {
  const wrap = document.getElementById('admin-courses-list');
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="caption text-slate">Đang tải...</p></div>';

  const courses = await svc.getCourses();

  if (courses.length === 0) {
    wrap.innerHTML = '<p class="caption text-slate" style="text-align:center;padding:32px;">Chưa có khóa học nào.</p>';
  } else {
    wrap.innerHTML = courses.map(course => `
      <div class="admin-course-card admin-card" data-course-id="${course.id}">
        <div class="admin-course-header">
          <div>
            <h3 class="heading-4" style="margin-bottom:4px;">${course.title}</h3>
            <div style="display:flex;gap:12px;align-items:center;">
              <span class="badge badge-yellow">${course.level || 'Cơ bản'}</span>
              <span class="caption text-slate">${course.category || ''}</span>
              <span class="caption text-slate">👤 ${course.instructor || ''}</span>
              <span class="caption text-slate">📹 ${course.totalLessons || 0} bài</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-outline btn-sm btn-edit-course"
              data-id="${course.id}"
              data-title="${encodeURIComponent(course.title)}"
              data-desc="${encodeURIComponent(course.description || '')}"
              data-instructor="${encodeURIComponent(course.instructor || '')}"
              data-level="${course.level || 'Cơ bản'}"
              data-category="${encodeURIComponent(course.category || '')}"
              data-thumb="${encodeURIComponent(course.thumbnail || '')}">
              Sửa
            </button>
            <button class="btn btn-sm btn-del-course" data-id="${course.id}" data-title="${course.title}"
              style="background:rgba(246,70,93,0.1);color:var(--red);border-radius:var(--radius-sm);padding:6px 16px;font-weight:600;">
              Xóa
            </button>
          </div>
        </div>
        <div class="admin-lessons-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <p class="caption" style="font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--slate);">Bài học</p>
            <button class="btn btn-primary btn-sm btn-add-lesson" data-course-id="${course.id}">+ Thêm bài</button>
          </div>
          <div class="lessons-drag-list" id="drag-list-${course.id}" data-course-id="${course.id}">
            <div class="loading-state" style="padding:16px;"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div>
          </div>
        </div>
      </div>
    `).join('');

    // Load lessons for each course
    for (const course of courses) {
      await loadLessonsForAdmin(course.id);
    }
  }

  document.getElementById('btn-add-course').onclick = () => openAddCourseModal();

  wrap.querySelectorAll('.btn-edit-course').forEach(btn => {
    btn.addEventListener('click', () => openEditCourseModal(btn.dataset));
  });
  wrap.querySelectorAll('.btn-del-course').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(
      `Xóa khóa học "${btn.dataset.title}"?`,
      'Toàn bộ bài học trong khóa học sẽ bị xóa vĩnh viễn.',
      async () => {
        await svc.deleteCourse(btn.dataset.id);
        showToast('Đã xóa khóa học', 'success');
        await loadCourses();
      }
    ));
  });
  wrap.querySelectorAll('.btn-add-lesson').forEach(btn => {
    btn.addEventListener('click', () => openAddLessonModal(btn.dataset.courseId));
  });
}

async function loadLessonsForAdmin(courseId) {
  const container = document.getElementById(`drag-list-${courseId}`);
  if (!container) return;

  const lessons = await svc.getLessons(courseId);

  if (lessons.length === 0) {
    container.innerHTML = '<p class="caption text-slate" style="padding:12px 0;">Chưa có bài học. Nhấn "+ Thêm bài" để bắt đầu.</p>';
    return;
  }

  container.innerHTML = lessons.map((l, i) => `
    <div class="drag-item" draggable="true" data-lesson-id="${l.id}" data-course-id="${courseId}">
      <div class="drag-handle" title="Kéo để sắp xếp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </div>
      <div class="drag-num">${i + 1}</div>
      <div style="flex:1;min-width:0;">
        <p style="font-weight:600;font-size:14px;margin-bottom:2px;">${l.title}</p>
        <p class="caption text-slate">${l.youtubeId ? `📹 ${l.youtubeId}` : 'Chưa có video'} ${l.duration ? `· ${l.duration}` : ''}</p>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm btn-edit-lesson" style="color:var(--yellow);"
          data-id="${l.id}" data-course-id="${courseId}"
          data-title="${encodeURIComponent(l.title)}"
          data-youtube="${l.youtubeId || ''}"
          data-duration="${l.duration || ''}"
          data-desc="${encodeURIComponent(l.description || '')}">
          Sửa
        </button>
        <button class="btn btn-ghost btn-sm btn-del-lesson" style="color:var(--red);"
          data-id="${l.id}" data-course-id="${courseId}" data-title="${l.title}">
          Xóa
        </button>
      </div>
    </div>
  `).join('');

  // Edit lessons
  container.querySelectorAll('.btn-edit-lesson').forEach(btn => {
    btn.addEventListener('click', () => openEditLessonModal(btn.dataset));
  });

  // Delete lessons
  container.querySelectorAll('.btn-del-lesson').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(
      `Xóa bài "${btn.dataset.title}"?`,
      'Bài học sẽ bị xóa vĩnh viễn.',
      async () => {
        await svc.deleteLesson(btn.dataset.courseId, btn.dataset.id);
        showToast('Đã xóa bài học', 'success');
        await loadLessonsForAdmin(btn.dataset.courseId);
      }
    ));
  });

  // Drag & Drop
  initDragDrop(container, courseId);
}

// -------- Drag & Drop --------
function initDragDrop(container, courseId) {
  let dragging = null;

  container.querySelectorAll('.drag-item').forEach(item => {
    item.addEventListener('dragstart', () => {
      dragging = item;
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', async () => {
      item.classList.remove('dragging');
      dragging = null;
      // Save new order
      const newOrder = [...container.querySelectorAll('.drag-item')].map(el => el.dataset.lessonId);
      await svc.reorderLessons(courseId, newOrder);
      // Re-number
      container.querySelectorAll('.drag-num').forEach((el, i) => { el.textContent = i + 1; });
      showToast('Đã lưu thứ tự', 'success');
    });
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    const afterEl = getDragAfterElement(container, e.clientY);
    if (afterEl) container.insertBefore(dragging, afterEl);
    else container.appendChild(dragging);
  });
}

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll('.drag-item:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// -------- Course Modal --------
function openAddCourseModal() {
  document.getElementById('modal-course-title').textContent = 'Thêm khóa học';
  document.getElementById('course-edit-id').value = '';
  document.getElementById('course-name').value = '';
  document.getElementById('course-desc').value = '';
  document.getElementById('course-instructor-input').value = '';
  document.getElementById('course-level').value = 'Cơ bản';
  document.getElementById('course-category').value = '';
  document.getElementById('course-thumb').value = '';
  document.getElementById('btn-course-submit').textContent = 'Tạo khóa học';
  openModal('modal-course');
}

function openEditCourseModal(data) {
  document.getElementById('modal-course-title').textContent = 'Sửa khóa học';
  document.getElementById('course-edit-id').value = data.id;
  document.getElementById('course-name').value = decodeURIComponent(data.title);
  document.getElementById('course-desc').value = decodeURIComponent(data.desc);
  document.getElementById('course-instructor-input').value = decodeURIComponent(data.instructor);
  document.getElementById('course-level').value = data.level;
  document.getElementById('course-category').value = decodeURIComponent(data.category);
  document.getElementById('course-thumb').value = decodeURIComponent(data.thumb);
  document.getElementById('btn-course-submit').textContent = 'Lưu thay đổi';
  openModal('modal-course');
}

document.getElementById('form-course').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('course-edit-id').value;
  const btn = document.getElementById('btn-course-submit');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  const data = {
    title: document.getElementById('course-name').value.trim(),
    description: document.getElementById('course-desc').value.trim(),
    instructor: document.getElementById('course-instructor-input').value.trim(),
    level: document.getElementById('course-level').value,
    category: document.getElementById('course-category').value.trim(),
    thumbnail: document.getElementById('course-thumb').value.trim(),
  };

  try {
    if (id) {
      await svc.updateCourse(id, data);
      showToast('Đã cập nhật khóa học', 'success');
    } else {
      await svc.createCourse({ ...data, totalLessons: 0 });
      showToast('Đã tạo khóa học mới', 'success');
    }
    closeModal('modal-course');
    await loadCourses();
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Lưu thay đổi' : 'Tạo khóa học';
  }
});

// -------- Lesson Modal --------
function openAddLessonModal(courseId) {
  document.getElementById('modal-lesson-title').textContent = 'Thêm bài học';
  document.getElementById('lesson-edit-id').value = '';
  document.getElementById('lesson-course-id').value = courseId;
  document.getElementById('lesson-name').value = '';
  document.getElementById('lesson-youtube').value = '';
  document.getElementById('lesson-duration').value = '';
  document.getElementById('lesson-desc').value = '';
  document.getElementById('btn-lesson-submit').textContent = 'Thêm bài học';
  openModal('modal-lesson');
}

function openEditLessonModal(data) {
  document.getElementById('modal-lesson-title').textContent = 'Sửa bài học';
  document.getElementById('lesson-edit-id').value = data.id;
  document.getElementById('lesson-course-id').value = data.courseId;
  document.getElementById('lesson-name').value = decodeURIComponent(data.title);
  document.getElementById('lesson-youtube').value = data.youtube || '';
  document.getElementById('lesson-duration').value = data.duration || '';
  document.getElementById('lesson-desc').value = decodeURIComponent(data.desc);
  document.getElementById('btn-lesson-submit').textContent = 'Lưu thay đổi';
  openModal('modal-lesson');
}

document.getElementById('form-lesson').addEventListener('submit', async e => {
  e.preventDefault();
  const lessonId = document.getElementById('lesson-edit-id').value;
  const courseId = document.getElementById('lesson-course-id').value;
  const btn = document.getElementById('btn-lesson-submit');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  const data = {
    title: document.getElementById('lesson-name').value.trim(),
    youtubeId: document.getElementById('lesson-youtube').value.trim(),
    duration: document.getElementById('lesson-duration').value.trim(),
    description: document.getElementById('lesson-desc').value.trim(),
  };

  try {
    if (lessonId) {
      await svc.updateLesson(courseId, lessonId, data);
      showToast('Đã cập nhật bài học', 'success');
    } else {
      await svc.addLesson(courseId, data);
      showToast('Đã thêm bài học mới', 'success');
    }
    closeModal('modal-lesson');
    await loadLessonsForAdmin(courseId);
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = lessonId ? 'Lưu thay đổi' : 'Thêm bài học';
  }
});

// ============================================================
// PROGRESS TAB
// ============================================================
async function loadProgressTab() {
  const select = document.getElementById('progress-course-select');
  const courses = await svc.getCourses();

  select.innerHTML = '<option value="">-- Chọn khóa học --</option>' +
    courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');

  select.onchange = async () => {
    if (!select.value) {
      document.getElementById('progress-table-wrap').innerHTML =
        '<p class="caption text-slate" style="text-align:center;padding:32px;">Chọn khóa học để xem tiến độ học viên</p>';
      return;
    }
    await renderProgressTable(select.value, courses.find(c => c.id === select.value));
  };
}

async function renderProgressTable(courseId, course) {
  const wrap = document.getElementById('progress-table-wrap');
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="caption text-slate">Đang tải...</p></div>';

  const [students, lessons, progressArr] = await Promise.all([
    svc.getAllStudents(),
    svc.getLessons(courseId),
    svc.getAllProgressForCourse(courseId)
  ]);

  const nonAdmin = students.filter(s => s.role !== 'admin');
  const progressMap = {};
  progressArr.forEach(p => { progressMap[p.uid] = p.completedLessons || []; });

  if (nonAdmin.length === 0) {
    wrap.innerHTML = '<p class="caption text-slate" style="text-align:center;padding:32px;">Chưa có học viên nào.</p>';
    return;
  }

  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Học viên</th>
            <th>Tiến độ</th>
            ${lessons.map(l => `<th style="max-width:120px;font-size:12px;white-space:normal;line-height:1.3;">${l.title}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${nonAdmin.map(s => {
            const done = progressMap[s.uid] || [];
            const pct = lessons.length ? Math.round(done.length / lessons.length * 100) : 0;
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="avatar avatar-sm">${s.name?.charAt(0) || 'U'}</div>
                    <div>
                      <p style="font-weight:600;font-size:13px;">${s.name}</p>
                      <p style="font-size:11px;color:var(--slate);">${s.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="min-width:120px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                      <span class="caption text-slate">${done.length}/${lessons.length}</span>
                      <span class="caption text-yellow" style="font-weight:700;">${pct}%</span>
                    </div>
                    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
                  </div>
                </td>
                ${lessons.map(l => `
                  <td style="text-align:center;">
                    ${done.includes(l.id)
                      ? '<span style="color:var(--green);font-size:18px;">✓</span>'
                      : '<span style="color:var(--border);font-size:14px;">—</span>'}
                  </td>
                `).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// CONFIRM DELETE MODAL
// ============================================================
function confirmDelete(title, msg, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  const btn = document.getElementById('confirm-ok-btn');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', async () => {
    closeModal('modal-confirm');
    await onConfirm();
  });
  openModal('modal-confirm');
}
