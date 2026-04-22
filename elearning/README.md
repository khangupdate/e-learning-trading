# EduLearn — eLearning Template

Website học trực tuyến tĩnh, chạy trên **GitHub Pages miễn phí**.

## 📁 Cấu trúc file

```
elearning/
├── index.html          ← File duy nhất, toàn bộ website
├── css/
│   ├── style.css       ← Design system (màu sắc, nút, card...)
│   └── layout.css      ← Layout các trang
├── js/
│   ├── data.js         ← ⭐ CHỈNH FILE NÀY để thêm khóa học/video
│   └── app.js          ← Logic (auth, progress, comments)
└── README.md
```

---

## 🚀 Deploy lên GitHub Pages

### Bước 1: Tạo GitHub Repository
1. Vào [github.com](https://github.com) → New repository
2. Tên repo: `elearning` (hoặc tên bạn muốn)
3. Chọn **Public**
4. Nhấn **Create repository**

### Bước 2: Upload file
1. Kéo thả toàn bộ thư mục vào GitHub
2. Hoặc dùng GitHub Desktop / git command

### Bước 3: Bật GitHub Pages
1. Vào **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. Nhấn **Save**

### Bước 4: Truy cập
Website của bạn sẽ có địa chỉ:
```
https://[username].github.io/elearning/
```

---

## ✏️ Cách thêm khóa học & video

Mở file `js/data.js` và chỉnh `COURSES_DATA`:

```javascript
{
  id: "course-01",              // ID duy nhất
  title: "Tên khóa học",
  description: "Mô tả...",
  thumbnail: "URL ảnh thumbnail",   // Có thể dùng: https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
  category: "Lập trình",
  level: "Cơ bản",
  totalLessons: 3,              // Số bài học
  instructor: "Tên giảng viên",
  lessons: [
    {
      id: "bai-01",             // ID duy nhất trong khóa học
      title: "Tên bài học",
      duration: "15:30",
      youtubeId: "VIDEO_ID",    // ⭐ Lấy từ URL YouTube: youtube.com/watch?v=VIDEO_ID
      description: "Mô tả bài học..."
    }
  ]
}
```

### Lấy YouTube Video ID

Từ URL: `https://www.youtube.com/watch?v=`**`PkZNo7MFNFg`**

→ Video ID là: `PkZNo7MFNFg`

> **Video không công khai (Unlisted)**: Vẫn nhúng được bình thường! Chỉ cần có link/ID là đủ.

---

## 👤 Tài khoản demo

- Email: `demo@example.com` / Mật khẩu: `demo123`
- Email: `admin@example.com` / Mật khẩu: `admin123`

Để thêm tài khoản mặc định, chỉnh `DEMO_USERS` trong `js/data.js`.

---

## 💾 Lưu trữ dữ liệu

| Dữ liệu | Lưu ở | Ghi chú |
|---------|-------|---------|
| Tài khoản | localStorage | Trên máy người dùng |
| Tiến độ học | localStorage | Trên máy người dùng |
| Bình luận | localStorage | Trên máy người dùng |

> ⚠️ Dữ liệu chỉ lưu trên trình duyệt. Để lưu cloud, tích hợp Firebase (xem hướng dẫn bên dưới).

---

## 🔥 Nâng cấp với Firebase (tùy chọn)

Để lưu tiến độ & bình luận lên cloud:
1. Tạo project tại [firebase.google.com](https://firebase.google.com)
2. Bật **Authentication** (Email/Password)
3. Bật **Firestore Database**
4. Thay thế các hàm trong `app.js` để gọi Firebase API

---

## 📝 Tùy chỉnh giao diện

Chỉnh màu sắc trong `css/style.css` phần `:root`:

```css
:root {
  --yellow: #F0B90B;    /* Màu chính */
  --dark: #222126;      /* Nền tối */
  /* ... */
}
```
