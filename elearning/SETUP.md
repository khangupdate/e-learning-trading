# Hướng dẫn Setup Hoàn Chỉnh

## 1. Tạo tài khoản Admin lần đầu

Vì không có form đăng ký, admin cần được tạo thủ công trong Firebase Console.

### Bước 1: Tạo tài khoản trong Authentication
1. Firebase Console → **Authentication** → **Users** → **Add user**
2. Email: `admin@elearning.com` (hoặc email bạn muốn)
3. Password: mật khẩu mạnh của bạn
4. Copy **User UID** được tạo ra (dạng: `abc123xyz...`)

### Bước 2: Tạo document trong Firestore
1. Firebase Console → **Firestore** → **Start collection**
2. Collection ID: `users`
3. Document ID: paste **User UID** từ bước trên
4. Thêm các fields:
   ```
   name     (string) : "Admin"
   email    (string) : "admin@elearning.com"
   role     (string) : "admin"
   createdAt (timestamp) : (chọn ngày hiện tại)
   ```
5. Nhấn **Save**

### Bước 3: Cập nhật ADMIN_EMAIL trong code
Mở file `js/firebase-config.js`, dòng cuối:
```javascript
export const ADMIN_EMAIL = "admin@elearning.com"; // ← Đổi thành email của bạn
```

---

## 2. Cài đặt Firestore Security Rules

1. Firebase Console → **Firestore** → tab **Rules**
2. Xóa toàn bộ nội dung cũ
3. Copy toàn bộ nội dung file `firestore.rules` và paste vào
4. Nhấn **Publish**

---

## 3. Deploy lên GitHub Pages

### Cấu trúc file cần upload:
```
elearning/
├── index.html
├── firestore.rules      (chỉ dùng để tham khảo, không cần upload)
├── SETUP.md             (không cần upload)
├── css/
│   ├── style.css
│   └── layout.css
└── js/
    ├── firebase-config.js
    ├── firebase-service.js
    ├── main.js
    └── admin.js
```

### Upload lên GitHub:
1. Tạo repo mới (Public) trên GitHub
2. Upload thư mục `elearning`
3. Settings → Pages → Branch: main → Save
4. Truy cập: `https://[username].github.io/elearning/`

---

## 4. Luồng sử dụng

### Admin:
1. Đăng nhập với `admin@elearning.com`
2. Tự động chuyển vào **Admin Panel**
3. Tab **Học viên** → Thêm học viên (cấp email + mật khẩu)
4. Tab **Khóa học** → Thêm khóa học → Thêm bài học (YouTube ID)
5. Tab **Tiến độ** → Chọn khóa học → Xem bảng tiến độ từng học viên

### Học viên:
1. Đăng nhập với tài khoản được admin cấp
2. Xem danh sách khóa học
3. Chọn khóa học → Chọn bài học → Xem video
4. Nhấn "Đánh dấu hoàn thành" sau khi xem xong
5. Bình luận, đặt câu hỏi dưới mỗi bài học

---

## 5. Lấy YouTube Video ID

Từ URL video:
```
https://www.youtube.com/watch?v=ABC123xyz
                               ↑ Đây là Video ID
```

Video **không công khai (Unlisted)** vẫn nhúng được bình thường.

---

## 6. Giới hạn Free Tier Firebase (Spark Plan)

| Tính năng | Giới hạn miễn phí |
|-----------|-------------------|
| Authentication | 10,000 người dùng/tháng |
| Firestore reads | 50,000 lượt/ngày |
| Firestore writes | 20,000 lượt/ngày |
| Firestore storage | 1 GB |

Đủ dùng cho vài trăm học viên hoạt động hàng ngày.
