import { db, auth } from "./firebase.js";
import {
  collection, getDocs, addDoc, doc, deleteDoc, updateDoc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/* ===================== AUTH STATE ===================== */
let currentUser = null;
let chartInstances = {};
let authChecked = false;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  // On first check, hide loading and show appropriate view
  if (!authChecked) {
    authChecked = true;
    const loader = document.getElementById('authLoader');
    if (loader) loader.classList.add('hidden');
  }

  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      alert('Unauthorized access');
      await signOut(auth);
      showAdminAuth();
      return;
    }
    hideAdminAuth();
    initAdmin(userDoc.data());
  } else {
    // Only show login if auth check is complete
    if (authChecked) showAdminAuth();
  }
});

function showAdminAuth() {
  document.getElementById('adminAuthOverlay').classList.remove('hidden');
  document.getElementById('adminContent').classList.add('hidden');
}

function hideAdminAuth() {
  document.getElementById('adminAuthOverlay').classList.add('hidden');
  document.getElementById('adminContent').classList.remove('hidden');
}

/* ===================== INLINE AUTH ===================== */
window.switchAuthTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'login') {
    document.getElementById('adminLoginForm').classList.remove('hidden');
    document.getElementById('adminRegisterForm').classList.add('hidden');
  } else {
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('adminRegisterForm').classList.remove('hidden');
  }
};

window.adminAuthLogin = async function() {
  const email = document.getElementById('authAdminEmail').value;
  const password = document.getElementById('authAdminPassword').value;
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

window.adminAuthRegister = async function() {
  const email = document.getElementById('authAdminRegEmail').value;
  const password = document.getElementById('authAdminRegPassword').value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), { email, role: 'admin' });
    alert('Admin registered successfully! Loading dashboard...');
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

/* ===================== INIT ===================== */
async function initAdmin(userData) {
  const email = userData.email || auth.currentUser.email;
  const initial = email.charAt(0).toUpperCase();

  document.getElementById('adminWelcome').innerText = `Welcome, ${email.split('@')[0]}!`;
  document.getElementById('adminName').innerText = email.split('@')[0];
  document.getElementById('adminDropdownEmail').innerText = email;
  document.getElementById('adminAvatar').innerText = initial;
  document.getElementById('adminCurrentDate').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  await loadAdminStats();
  loadCoursesTable();
  loadEnrollmentsList();
  loadAnalytics();
}

/* ===================== TABS & UI ===================== */
window.switchAdminTab = function(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  event.currentTarget.classList.add('active');

  document.getElementById('adminCoursesSection').classList.add('hidden');
  document.getElementById('adminEnrollmentsSection').classList.add('hidden');
  document.getElementById('adminAnalyticsSection').classList.add('hidden');
  document.getElementById('adminReportsSection').classList.add('hidden');

  if (tab === 'courses') {
    document.getElementById('adminCoursesSection').classList.remove('hidden');
  } else if (tab === 'enrollments') {
    document.getElementById('adminEnrollmentsSection').classList.remove('hidden');
    loadEnrollmentsList();
  } else if (tab === 'analytics') {
    document.getElementById('adminAnalyticsSection').classList.remove('hidden');
    loadAnalytics();
  } else if (tab === 'reports') {
    document.getElementById('adminReportsSection').classList.remove('hidden');
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
  document.getElementById('sidebar').classList.toggle('collapsed');
});

/* ===================== STATS ===================== */
async function loadAdminStats() {
  const coursesSnap = await getDocs(collection(db, "courses"));
  const enrollSnap = await getDocs(collection(db, "enrollments"));

  let totalCapacity = 0;
  let totalEnrolled = 0;

  coursesSnap.forEach(d => {
    const c = d.data();
    totalCapacity += c.capacity || 0;
    totalEnrolled += c.currentEnrollment || 0;
  });

  const fillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  document.getElementById('statTotalCourses').innerText = coursesSnap.size;
  document.getElementById('statTotalStudents').innerText = enrollSnap.size;
  document.getElementById('statTotalCapacity').innerText = totalCapacity;
  document.getElementById('statFillRate').innerText = fillRate + '%';
  document.getElementById('adminNotifCount').innerText = enrollSnap.size;
}

/* ===================== COURSES TABLE ===================== */
window.loadCoursesTable = async function() {
  const searchTerm = document.getElementById('adminSearch')?.value.toLowerCase() || '';
  const tbody = document.getElementById('adminCoursesBody');
  tbody.innerHTML = '';

  const snapshot = await getDocs(collection(db, "courses"));

  snapshot.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;

    if (searchTerm && !c.title.toLowerCase().includes(searchTerm)) return;

    const fillPct = c.capacity > 0 ? Math.round((c.currentEnrollment / c.capacity) * 100) : 0;
    const isActive = c.isActive !== false;
    const row = document.createElement('tr');
    row.style.opacity = isActive ? '1' : '0.5';
    row.innerHTML = `
      <td>
        <strong>${c.title}</strong>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${c.courseCode || c.title.substring(0,5).toUpperCase()} • ${c.credits || 3} cr • ${c.schedule || 'MWF 10:00'}</div>
      </td>
      <td>${c.currentEnrollment}</td>
      <td>${c.capacity}</td>
      <td>
        <div class="seat-bar"><div class="seat-fill" style="width: ${fillPct}%"></div></div>
        <small>${fillPct}%</small>
      </td>
      <td>
        <span class="badge-status ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
      </td>
      <td>
        <button onclick="updateCourse('${id}', '${c.title}', ${c.capacity}, '${c.courseCode || ''}', ${c.credits || 3}, '${c.schedule || 'MWF 10:00'}')" class="btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
        <button onclick="toggleCourseActive('${id}', ${isActive})" class="btn-toggle" title="${isActive ? 'Deactivate' : 'Activate'}"><i class="fas fa-power-off"></i></button>
        <button onclick="deleteCourse('${id}')" class="btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  });
};

/* ===================== ADD COURSE MODAL ===================== */
window.openAddModal = function() {
  document.getElementById('addModal').classList.remove('hidden');
};

window.closeAddModal = function() {
  document.getElementById('addModal').classList.add('hidden');
  document.getElementById('modalTitle').value = '';
  document.getElementById('modalCourseCode').value = '';
  document.getElementById('modalCredits').value = '3';
  document.getElementById('modalSchedule').value = '';
  document.getElementById('modalCapacity').value = '100';
};

window.submitAddCourse = async function() {
  const title = document.getElementById("modalTitle").value.trim();
  const courseCode = document.getElementById("modalCourseCode").value.trim().toUpperCase();
  const credits = parseInt(document.getElementById("modalCredits").value) || 3;
  const schedule = document.getElementById("modalSchedule").value.trim();
  const capacity = parseInt(document.getElementById("modalCapacity").value);

  if (!title || !capacity) {
    alert("Please fill Title and Capacity");
    return;
  }

  await addDoc(collection(db, "courses"), {
    title,
    courseCode: courseCode || title.substring(0,5).toUpperCase(),
    credits,
    schedule: schedule || 'MWF 10:00',
    capacity,
    currentEnrollment: 0,
    isActive: true
  });

  closeAddModal();
  loadCoursesTable();
  loadAdminStats();
  loadAnalytics();
  alert("Course added successfully!");
};

/* ===================== UPDATE / DELETE / TOGGLE ===================== */
window.updateCourse = async function(id, currentTitle, currentCapacity, currentCourseCode, currentCredits, currentSchedule) {
  const newTitle = prompt("New title:", currentTitle);
  const newCourseCode = prompt("New course code:", currentCourseCode || '');
  const newCredits = prompt("New credits:", currentCredits || 3);
  const newSchedule = prompt("New schedule:", currentSchedule || 'MWF 10:00');
  const newCapacity = prompt("New capacity:", currentCapacity);

  if (newTitle && newCapacity) {
    await updateDoc(doc(db, "courses", id), {
      title: newTitle,
      courseCode: (newCourseCode || newTitle.substring(0,5)).toUpperCase(),
      credits: parseInt(newCredits) || 3,
      schedule: newSchedule || 'MWF 10:00',
      capacity: parseInt(newCapacity)
    });
    loadCoursesTable();
    loadAdminStats();
    loadAnalytics();
    alert("Course updated!");
  }
};

window.toggleCourseActive = async function(id, currentStatus) {
  await updateDoc(doc(db, "courses", id), { isActive: !currentStatus });
  loadCoursesTable();
  alert(!currentStatus ? "Course activated!" : "Course deactivated!");
};

window.deleteCourse = async function(id) {
  if (confirm("Delete this course? This action cannot be undone.")) {
    await deleteDoc(doc(db, "courses", id));
    loadCoursesTable();
    loadAdminStats();
    loadAnalytics();
    alert("Course deleted.");
  }
};

/* ===================== ENROLLMENTS ===================== */
window.loadEnrollmentsList = async function() {
  const snapshot = await getDocs(collection(db, "enrollments"));
  const container = document.getElementById("adminEnrollmentsList");
  container.innerHTML = "";

  const courseStats = {};
  snapshot.forEach(docSnap => {
    const e = docSnap.data();
    courseStats[e.courseId] = (courseStats[e.courseId] || 0) + 1;
  });

  if (Object.keys(courseStats).length === 0) {
    container.innerHTML = '<p class="empty-state">No enrollments yet.</p>';
    return;
  }

  for (const [courseId, count] of Object.entries(courseStats)) {
    const courseSnap = await getDoc(doc(db, "courses", courseId));
    const course = courseSnap.data();
    const div = document.createElement('div');
    div.className = 'course-row';
    div.innerHTML = `
      <div class="course-info">
        <strong>${course ? course.title : courseId}</strong>
        <span class="meta">${count} student${count > 1 ? 's' : ''} enrolled</span>
      </div>
      <span class="badge-success">${count} students</span>
    `;
    container.appendChild(div);
  }
};

/* ===================== ANALYTICS ===================== */
window.loadAnalytics = async function() {
  const snapshot = await getDocs(collection(db, "courses"));

  let labels = [];
  let data = [];

  snapshot.forEach(d => {
    const c = d.data();
    labels.push(c.title);
    data.push(c.currentEnrollment);
  });

  // Destroy old charts if they exist
  if (chartInstances.bar) chartInstances.bar.destroy();
  if (chartInstances.pie) chartInstances.pie.destroy();
  if (chartInstances.line) chartInstances.line.destroy();

  chartInstances.bar = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Students", data, backgroundColor: '#3b82f6' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  chartInstances.pie = new Chart(document.getElementById("pieChart"), {
    type: "pie",
    data: { labels, datasets: [{ data, backgroundColor: ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'] }] },
    options: { responsive: true }
  });

  chartInstances.line = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: { labels, datasets: [{ label: "Enrollment Trend", data, borderColor: '#8b5cf6', tension: 0.4, fill: true, backgroundColor: 'rgba(139,92,246,0.1)' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
};

/* ===================== CSV EXPORT ===================== */
window.generateCSV = async function(reportType) {
  let csvContent = "data:text/csv;charset=utf-8,";

  if (reportType === 'enrollment') {
    csvContent += "Course Title,Course Code,Schedule,Capacity,Enrolled,Fill Rate,Status\n";
    const snapshot = await getDocs(collection(db, "courses"));
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      const fillRate = c.capacity > 0 ? Math.round((c.currentEnrollment / c.capacity) * 100) : 0;
      const status = c.isActive !== false ? 'Active' : 'Inactive';
      csvContent += `"${c.title}","${c.courseCode || ''}","${c.schedule || ''}",${c.capacity},${c.currentEnrollment},${fillRate}%,${status}\n`;
    });
  } else if (reportType === 'students') {
    csvContent += "Course,Student Email,Enrollment Date\n";
    const enrollSnap = await getDocs(collection(db, "enrollments"));
    for (const docSnap of enrollSnap.docs) {
      const e = docSnap.data();
      const courseSnap = await getDoc(doc(db, "courses", e.courseId));
      const course = courseSnap.data();
      const studentSnap = await getDoc(doc(db, "users", e.studentId));
      const student = studentSnap.data();
      const date = e.timestamp ? new Date(e.timestamp.toDate()).toLocaleDateString() : 'N/A';
      csvContent += `"${course ? course.title : e.courseId}","${student ? student.email : e.studentId}","${date}"\n`;
    }
  } else if (reportType === 'payments') {
    csvContent += "Student Email,Amount,Date,Status\n";
    const paySnap = await getDocs(collection(db, "payments"));
    for (const docSnap of paySnap.docs) {
      const p = docSnap.data();
      const studentSnap = await getDoc(doc(db, "users", p.studentId));
      const student = studentSnap.data();
      const date = p.timestamp ? new Date(p.timestamp.toDate()).toLocaleDateString() : 'N/A';
      const status = p.status || 'Completed';
      csvContent += `"${student ? student.email : p.studentId}",${p.amount || 0},"${date}",${status}\n`;
    }
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  alert(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} CSV downloaded!`);
};

/* ===================== PDF REPORT ===================== */
window.generatePDF = async function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const snapshot = await getDocs(collection(db, "courses"));

  let y = 10;
  doc.setFontSize(18);
  doc.text("Course Enrollment Report", 10, y);
  y += 12;

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, y);
  y += 15;

  doc.setTextColor(0);
  snapshot.forEach(docSnap => {
    const c = docSnap.data();
    const fillRate = c.capacity > 0 ? Math.round((c.currentEnrollment / c.capacity) * 100) : 0;
    doc.setFontSize(12);
    doc.text(`${c.title} [${c.courseCode || ''}]`, 10, y);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Enrolled: ${c.currentEnrollment} / ${c.capacity} (${fillRate}%) | Credits: ${c.credits || 3} | Schedule: ${c.schedule || 'N/A'}`, 10, y + 6);
    doc.setTextColor(0);
    y += 18;
  });

  doc.save("course-report.pdf");
  alert("Report downloaded!");
};

/* ===================== EMAIL NOTIFICATION SIMULATION ===================== */
async function sendNotification(userId, type, details) {
  // Store notification in Firestore (simulating email delivery)
  await addDoc(collection(db, "notifications"), {
    userId,
    type, // 'registration', 'payment', 'drop', 'course_update'
    details,
    timestamp: new Date(),
    read: false
  });
  console.log(`Notification sent to ${userId}: ${type}`);
}

/* ===================== LOGOUT ===================== */
window.logout = function() {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
};

/* ===================== SEARCH ===================== */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('adminSearch');
  if (searchInput) searchInput.addEventListener('input', loadCoursesTable);
});

