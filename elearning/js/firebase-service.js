// ============================================
// FIREBASE SERVICES
// Auth + Firestore operations
// ============================================
import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  deleteUser as fbDeleteUser,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, query, orderBy,
  writeBatch, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// -------- AUTH --------
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, "users", cred.user.uid));
  return { uid: cred.user.uid, ...userDoc.data() };
}

export async function logoutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// -------- USERS (Admin only) --------
export async function createStudent(name, email, password) {
  // Create Firebase Auth account
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  // Save to Firestore
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    role: "student",
    createdAt: serverTimestamp()
  });
  return uid;
}

export async function getAllStudents() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function deleteStudent(uid) {
  await deleteDoc(doc(db, "users", uid));
  // Note: Deleting Firebase Auth user requires admin SDK or re-auth
  // We mark as deleted in Firestore; Auth account becomes inactive
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// -------- COURSES --------
export async function getCourses() {
  const snap = await getDocs(query(collection(db, "courses"), orderBy("order", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCourse(courseId) {
  const snap = await getDoc(doc(db, "courses", courseId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCourse(data) {
  const courses = await getCourses();
  const ref = await addDoc(collection(db, "courses"), {
    ...data,
    order: courses.length,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateCourse(courseId, data) {
  await updateDoc(doc(db, "courses", courseId), data);
}

export async function deleteCourse(courseId) {
  // Delete all lessons first
  const lessons = await getLessons(courseId);
  const batch = writeBatch(db);
  lessons.forEach(l => batch.delete(doc(db, "courses", courseId, "lessons", l.id)));
  batch.delete(doc(db, "courses", courseId));
  await batch.commit();
}

// -------- LESSONS --------
export async function getLessons(courseId) {
  const snap = await getDocs(
    query(collection(db, "courses", courseId, "lessons"), orderBy("order", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addLesson(courseId, data) {
  const lessons = await getLessons(courseId);
  const ref = await addDoc(collection(db, "courses", courseId, "lessons"), {
    ...data,
    order: lessons.length,
    createdAt: serverTimestamp()
  });
  // Update totalLessons count
  await updateDoc(doc(db, "courses", courseId), { totalLessons: lessons.length + 1 });
  return ref.id;
}

export async function updateLesson(courseId, lessonId, data) {
  await updateDoc(doc(db, "courses", courseId, "lessons", lessonId), data);
}

export async function deleteLesson(courseId, lessonId) {
  await deleteDoc(doc(db, "courses", courseId, "lessons", lessonId));
  const lessons = await getLessons(courseId);
  await updateDoc(doc(db, "courses", courseId), { totalLessons: lessons.length });
}

export async function reorderLessons(courseId, orderedIds) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "courses", courseId, "lessons", id), { order: index });
  });
  await batch.commit();
}

// -------- PROGRESS --------
export async function getProgress(uid, courseId) {
  const snap = await getDoc(doc(db, "progress", `${uid}_${courseId}`));
  return snap.exists() ? snap.data().completedLessons || [] : [];
}

export async function markLessonDone(uid, courseId, lessonId) {
  const ref = doc(db, "progress", `${uid}_${courseId}`);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data().completedLessons || [] : [];
  if (!current.includes(lessonId)) {
    await setDoc(ref, {
      uid, courseId,
      completedLessons: [...current, lessonId],
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export async function getAllProgressForCourse(courseId) {
  const snap = await getDocs(
    query(collection(db, "progress"), where("courseId", "==", courseId))
  );
  return snap.docs.map(d => d.data());
}

export async function getAllProgressForUser(uid) {
  const snap = await getDocs(
    query(collection(db, "progress"), where("uid", "==", uid))
  );
  return snap.docs.map(d => d.data());
}

// -------- COMMENTS --------
export async function getComments(courseId, lessonId) {
  const snap = await getDocs(
    query(
      collection(db, "comments", `${courseId}_${lessonId}`, "items"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addComment(courseId, lessonId, uid, name, text) {
  await addDoc(collection(db, "comments", `${courseId}_${lessonId}`, "items"), {
    uid, author: name, text,
    createdAt: serverTimestamp()
  });
}

export async function deleteComment(courseId, lessonId, commentId) {
  await deleteDoc(doc(db, "comments", `${courseId}_${lessonId}`, "items", commentId));
}
