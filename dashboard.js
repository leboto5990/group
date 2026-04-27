import { db, auth } from "./firebase.js";
import {
  collection, getDocs, addDoc, doc, updateDoc, getDoc, deleteDoc, query, where, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/* ===================== AUTH STATE ===================== */
let currentUser = null;
let authChecked = false;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!authChecked) {
    authChecked = true;
    const loader = document.getElementById('authLoader');
    if (loader) loader.classList.add('hidden');
  }

  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'student') {
      alert('Unauthorized access');
      await signOut(auth);
      showAuth();
      return;
    }
    hideAuth();
    initDashboard(userDoc.data());
  } else {
    if (authChecked) showAuth();
  }
});

function showAuth() {
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('dashboardContent').classList.add('hidden');
}

function hideAuth() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('dashboardContent').classList.remove('hidden');
}

/* ===================== INLINE AUTH ===================== */
window.switchAuthTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'login') {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  } else {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  }
};

window.authLogin = async function() {
  const email = document.getElementById('authLoginEmail').value;
  const password = document.getElementById('authLoginPassword').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      alert('User not found. Please register first.');
    } else {
      alert('Invalid credentials. Check email/password.');
    }
  }
};

window.authRegister = async function() {
  const email = document.getElementById('authRegEmail').value;
  const password = document.getElementById('authRegPassword').value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), { email, role: 'student' });
    alert('Registered successfully! Loading dashboard...');
    window.location.reload();
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      alert('Email already registered. Please login.');
      switchAuthTab('login');
    } else {
      alert(error.message);
    }
  }
};

/* ===================== DASHBOARD INIT ===================== */
async function initDashboard(userData) {
  const email = userData.email || auth.currentUser.email;
  const initial = email.charAt(0).toUpperCase();

  document.getElementById('welcomeMessage').innerText = `Welcome back, ${email.split('@')[0]}!`;
  document.getElementById('userName').innerText = email.split('@')[0];
  document.getElementById('dropdownEmail').innerText = email;
  document.getElementById('profileEmail').innerText = email;
  document.getElementById('userAvatar').innerText = initial;
  document.getElementById('profileAvatar').innerText = initial;
  document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  loadCourses();
  loadMyCourses();
  updateStats();
  loadNotifications();
}

/* ===================== TABS & UI ===================== */
window.switchTab = function(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  event.currentTarget.classList.add('active');

  document.getElementById('coursesSection').classList.add('hidden');
  document.getElementById('scheduleSection').classList.add('hidden');
  document.getElementById('paymentsSection').classList.add('hidden');
  document.getElementById('profileSection').classList.add('hidden');

  if (tab === 'courses') {
    document.getElementById('coursesSection').classList.remove('hidden');
    document.getElementById('sectionTitle').innerText = 'Available Courses';
  } else if (tab === 'schedule') {
    document.getElementById('scheduleSection').classList.remove('hidden');
    document.getElementById('sectionTitle').innerText = 'My Schedule';
    loadMyCourses();
  } else if (tab === 'payments') {
    document.getElementById('paymentsSection').classList.remove('hidden');
    document.getElementById('sectionTitle').innerText = 'Payments';
  } else if (tab === 'profile') {
    document.getElementById('profileSection').classList.remove('hidden');
    document.getElementById('sectionTitle').innerText = 'My Profile';
  }
};

window.toggleDropdown = function() {
  document.getElementById('dropdownMenu').classList.toggle('show');
};

document.addEventListener('click', (e) => {
  const dd = document.getElementById('userDropdown');
  if (dd && !dd.contains(e.target)) {
    document.getElementById('dropdownMenu').classList.remove('show');
  }
});

document.getElementById('menuToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  } else {
    sidebar.classList.toggle('collapsed');
  }
});

window.closeSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.remove('open');
  backdrop.classList.remove('show');
};

/* ===================== NOTIFICATIONS ===================== */
async function sendNotification(userId, type, details) {
  await addDoc(collection(db, "notifications"), {
    userId, type, details, timestamp: new Date(), read: false
  });
}

async function loadNotifications() {
  const q = query(collection(db, "notifications"), where("userId", "==", auth.currentUser.uid), where("read", "==", false));
  const snap = await getDocs(q);
  document.getElementById('notifCount').innerText = snap.size;

  // Populate notification panel
  const list = document.getElementById('notifList');
  if (snap.empty) {
    list.innerHTML = '<p class="notif-empty">No new notifications</p>';
    return;
  }

  list.innerHTML = '';
  snap.forEach(docSnap => {
    const n = docSnap.data();
    const type = n.type || 'info';
    const iconMap = { registration: 'fa-check', drop: 'fa-trash', payment: 'fa-credit-card', info: 'fa-bell' };
    const clsMap = { registration: 'reg', drop: 'drop', payment: 'pay', info: 'reg' };
    const time = n.timestamp ? new Date(n.timestamp.toDate()).toLocaleString() : '';
    const div = document.createElement('div');
    div.className = 'notif-item unread';
    div.setAttribute('data-id', docSnap.id);
    div.innerHTML = `
      <div class="notif-icon-sm ${clsMap[type] || 'reg'}"><i class="fas ${iconMap[type] || 'fa-bell'}"></i></div>
      <div class="notif-body">
        <p>${n.details?.message || 'Notification'}</p>
        <small>${time}</small>
      </div>
    `;
    div.onclick = () => markOneRead(docSnap.id);
    list.appendChild(div);
  });
}

window.toggleNotifPanel = function() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    loadNotifications();
  }
};

async function markOneRead(id) {
  await updateDoc(doc(db, "notifications", id), { read: true });
  loadNotifications();
}

window.markAllRead = async function() {
  const q = query(collection(db, "notifications"), where("userId", "==", auth.currentUser.uid), where("read", "==", false));
  const snap = await getDocs(q);
  const promises = [];
  snap.forEach(docSnap => {
    promises.push(updateDoc(doc(db, "notifications", docSnap.id), { read: true }));
  });
  await Promise.all(promises);
  loadNotifications();
};

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  const bell = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');
  if (bell && panel && !bell.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

/* ===================== COURSES ===================== */
window.loadCourses = async function() {
  const searchTerm = document.getElementById('courseSearch').value.toLowerCase();
  const filter = document.getElementById('courseFilter').value;
  const tbody = document.getElementById('coursesBody');
  tbody.innerHTML = '';

  const snapshot = await getDocs(collection(db, "courses"));

  snapshot.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;

    if (c.isActive === false) return;

    const code = c.courseCode || c.title.substring(0, 5).toUpperCase();
    const credits = c.credits || 3;
    const schedule = c.schedule || 'MWF 10:00';

    if (searchTerm && !c.title.toLowerCase().includes(searchTerm)) return;
    if (filter !== 'All' && !code.startsWith(filter)) return;

    const isFull = c.currentEnrollment >= c.capacity;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="code-badge">${code}</span></td>
      <td><strong>${c.title}</strong></td>
      <td>${credits}</td>
      <td><span class="schedule-tag"><i class="far fa-clock"></i> ${schedule}</span></td>
      <td>
        <div class="seat-bar"><div class="seat-fill" style="width: ${(c.currentEnrollment / c.capacity) * 100}%"></div></div>
        <small>${c.currentEnrollment}/${c.capacity}</small>
      </td>
      <td>
        ${isFull
          ? '<span class="badge-full">FULL</span>'
          : `<button onclick="showCourseDetails('${id}', '${c.title.replace(/'/g, "\\'")}', ${c.currentEnrollment}, ${c.capacity}, '${code}', ${credits}, '${schedule}')" class="btn-register">Register</button>`}
      </td>
    `;
    tbody.appendChild(row);
  });
};

window.showCourseDetails = function(courseId, title, enrollment, capacity, code, credits, schedule) {
  const details = 'Course: ' + title + '\nCode: ' + code + '\nCredits: ' + credits + '\nSchedule: ' + schedule + '\nEnrollment: ' + enrollment + '/' + capacity + '\n\nConfirm registration?';
  if (confirm(details)) register(courseId, title, code);
};

window.register = async function(courseId, title, code) {
  const ref = doc(db, "courses", courseId);
  const snap = await getDoc(ref);
  const c = snap.data();

  if (c.currentEnrollment >= c.capacity) { alert("Course full"); return; }

  const q = query(collection(db, "enrollments"), where("studentId", "==", auth.currentUser.uid), where("courseId", "==", courseId));
  const existing = await getDocs(q);
  if (!existing.empty) { alert("Already enrolled"); return; }

  await addDoc(collection(db, "enrollments"), {
    studentId: auth.currentUser.uid,
    courseId,
    timestamp: new Date()
  });
  await updateDoc(ref, { currentEnrollment: c.currentEnrollment + 1 });

  await sendNotification(auth.currentUser.uid, 'registration', {
    courseTitle: title,
    courseCode: code || '',
    message: 'You have successfully registered for ' + title
  });

  alert('Registration confirmed! Check your notifications.');
  loadCourses();
  loadMyCourses();
  updateStats();
  loadNotifications();
};

/* ===================== MY SCHEDULE ===================== */
window.loadMyCourses = async function() {
  const q = query(collection(db, "enrollments"), where("studentId", "==", auth.currentUser.uid));
  const snapshot = await getDocs(q);
  document.getElementById('scheduleCount').textContent = snapshot.size;
  const container = document.getElementById("myCoursesList");
  container.innerHTML = "";

  if (snapshot.empty) {
    container.innerHTML = '<p class="empty-state">No courses enrolled yet. Browse available courses to register!</p>';
    return;
  }

  for (const docSnap of snapshot.docs) {
    const enrollment = docSnap.data();
    const courseSnap = await getDoc(doc(db, "courses", enrollment.courseId));
    const course = courseSnap.data();
    const code = course ? (course.courseCode || course.title.substring(0,5).toUpperCase()) : '';
    const credits = course ? (course.credits || 3) : 3;
    const schedule = course ? (course.schedule || 'MWF 10:00') : 'MWF 10:00';
    const div = document.createElement('div');
    div.className = 'course-row';
    div.innerHTML = `
      <div class="course-info">
        <strong>${course ? course.title : enrollment.courseId}</strong>
        <span class="meta">${schedule} • ${credits} Credits • ${code}</span>
      </div>
      <button onclick="drop('${docSnap.id}', '${(course ? course.title : '').replace(/'/g, "\\'")}')" class="btn-drop"><i class="fas fa-trash"></i> Drop</button>
    `;
    container.appendChild(div);
  }
};

window.drop = async function(id, courseTitle) {
  await deleteDoc(doc(db, "enrollments", id));

  await sendNotification(auth.currentUser.uid, 'drop', {
    courseTitle: courseTitle || 'Course',
    message: 'You have dropped ' + (courseTitle || 'a course')
  });

  alert('Course dropped successfully.');
  loadMyCourses();
  loadCourses();
  updateStats();
  loadNotifications();
};

/* ===================== PAYMENTS ===================== */
window.makePayment = async function() {
  const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  await addDoc(collection(db, "payments"), {
    studentId: auth.currentUser.uid,
    amount: 12000,
    transactionId,
    status: 'Completed',
    timestamp: new Date()
  });

  await sendNotification(auth.currentUser.uid, 'payment', {
    amount: 12000,
    transactionId,
    status: 'Completed',
    message: 'Payment of R12,000 processed successfully. Transaction ID: ' + transactionId
  });

  document.getElementById('paidAmount').innerText = '12,000';
  document.getElementById('dueAmount').innerText = '0';
  alert('Payment of R12,000 processed! Transaction ID: ' + transactionId);
  loadNotifications();
};

/* ===================== STATS ===================== */
async function updateStats() {
  const q = query(collection(db, "enrollments"), where("studentId", "==", auth.currentUser.uid));
  const snapshot = await getDocs(q);
  let totalCredits = 0;

  for (const docSnap of snapshot.docs) {
    const e = docSnap.data();
    const courseSnap = await getDoc(doc(db, "courses", e.courseId));
    const course = courseSnap.data();
    totalCredits += course ? (course.credits || 3) : 3;
  }

  const count = snapshot.size;
  document.getElementById('statCourses').innerText = count;
  document.getElementById('statCredits').innerText = totalCredits;
  document.getElementById('statHours').innerText = count * 3;
}

/* ===================== LOGOUT ===================== */
window.logout = function() {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
};

/* ===================== SEARCH & FILTER ===================== */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('courseSearch');
  const filterSelect = document.getElementById('courseFilter');
  if (searchInput) searchInput.addEventListener('input', loadCourses);
  if (filterSelect) filterSelect.addEventListener('change', loadCourses);
});

