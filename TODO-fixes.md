# System Fix Plan - Complete ✅

## Steps:
1. [x] Fix admin.js - add getDoc import, fix logout(), add auth guard
2. [x] Fix dashboard.js - fix welcomeUser selector, add auth guard
3. [x] Fix student-login.html - proper signOut(auth) import
4. [x] Fix admin-login.html - proper signOut(auth) import
5. [x] Update TODO-register.md status
6. [x] Verified all fixes applied

## Summary of Changes:
- **admin.js**: Added missing `getDoc` import, added `auth` + `signOut` + `onAuthStateChanged` imports, fixed `logout()` to call Firebase `signOut(auth)`, added auth guard that redirects non-admin/unauthenticated users
- **dashboard.js**: Fixed `welcomeUser()` selector from `.navbar h2` → `.navbar h1`, added auth guard that redirects non-student/unauthenticated users
- **student-login.html**: Replaced broken `auth.signOut()` with proper `signOut(auth)` call
- **admin-login.html**: Replaced broken `auth.signOut()` with proper `signOut(auth)` call

## Test Commands:
```bash
# Serve locally with Python
python -m http.server 8080
# Or with Node
npx serve .
```
Then open http://localhost:8080

