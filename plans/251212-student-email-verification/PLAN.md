# Implementation Plan: Student Email Verification

**Feature:** Student Email Domain Validation + Google OAuth Removal  
**Approach:** Simple 'edu' domain validation + Complete OAuth removal  
**Created:** 2025-12-12  
**Status:** Planning  
**Reference:** `plans/reports/brainstorm-251212-student-email-verification.md`

---

## Overview

Implement email domain validation để chỉ cho phép student emails (domain chứa 'edu') khi đăng ký. Đồng thời remove hoàn toàn Google OAuth authentication.

**Key Requirements:**
- ✅ Validate email domain có chứa 'edu' như standalone word
- ✅ Block registration nếu email không hợp lệ
- ✅ Grandfather policy - existing users không bị ảnh hưởng
- ✅ Remove Google OAuth hoàn toàn
- ✅ Keep `google_id` field (backward compatible)

---

## Phase 1: Email Validation Function

### 1.1 Create Validation Helper

**File:** `backend/routes/auth.js` (top of file, before routes)

**Function:**
```javascript
/**
 * Validate if email domain contains 'edu' as standalone word
 * @param {string} email - Email address to validate
 * @returns {boolean} - true if valid student email, false otherwise
 */
function isValidStudentEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Extract domain part (after @)
  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
    return false;
  }
  
  const domain = normalizedEmail.substring(atIndex + 1);
  
  // Split domain by dots and check if any part exactly equals 'edu'
  const domainParts = domain.split('.');
  return domainParts.includes('edu');
}
```

**Test Cases (Manual):**
- ✅ `student@hcmute.edu.vn` → true
- ✅ `user@student.hcmute.edu.vn` → true
- ✅ `test@university.edu` → true
- ✅ `admin@school.edu.uk` → true
- ✅ `STUDENT@HCMUTE.EDU.VN` → true (case insensitive)
- ❌ `test@gmail.com` → false
- ❌ `fake@edulink.com` → false
- ❌ `user@education.org` → false
- ❌ `notanemail` → false
- ❌ `hcmute.edu.vn` → false (no @)

**Tasks:**
- [ ] Add function to `backend/routes/auth.js`
- [ ] Test function manually với test cases
- [ ] Verify logic handles edge cases

---

### 1.2 Integrate into Register Endpoint

**File:** `backend/routes/auth.js` - `POST /auth/register`

**Location:** AFTER email normalization, BEFORE checking existing user

**Code:**
```javascript
// Normalize email
const normalizedEmail = email.toLowerCase().trim();

// Validate student email domain
if (!isValidStudentEmail(normalizedEmail)) {
  return res.status(400).json({ 
    error: 'Email phải là email sinh viên hợp lệ (domain phải chứa "edu"). Ví dụ: student@hcmute.edu.vn'
  });
}

// Check if user exists (existing code continues...)
```

**Behavior:**
- Return 400 status code nếu email invalid
- Error message rõ ràng với ví dụ
- Block registration hoàn toàn

**Tasks:**
- [ ] Add validation check vào register endpoint
- [ ] Position validation BEFORE existing user check
- [ ] Test với valid email → success
- [ ] Test với invalid email → 400 error
- [ ] Verify error message hiển thị đúng

---

## Phase 2: Remove Google OAuth

### 2.1 Backend - Remove OAuth Endpoints

**File:** `backend/routes/auth.js`

**Remove:**
- [ ] Remove `import passport from 'passport'` (line 4)
- [ ] Remove entire `GET /auth/google` endpoint (lines ~556-571)
- [ ] Remove entire `GET /auth/google/callback` endpoint (lines ~574-627)
- [ ] Remove entire `GET /auth/google/status` endpoint (lines ~630-638)
- [ ] Remove error message về OAuth trong `POST /auth/forgot-password`:
  ```javascript
  // Remove this check:
  if (!user.password_hash) {
    return res.status(400).json({ 
      error: 'Tài khoản này đăng nhập bằng Google. Không thể đặt lại mật khẩu.' 
    });
  }
  ```

**Tasks:**
- [ ] Remove passport import
- [ ] Remove Google OAuth endpoints
- [ ] Remove OAuth error in forgot-password
- [ ] Test register/login flow vẫn hoạt động

---

### 2.2 Backend - Remove Passport Config

**File:** `backend/server.js`

**Remove:**
- [ ] Remove `import passport from 'passport'` (line 8)
- [ ] Remove `import configurePassport from './config/passport.js'` (line 10)
- [ ] Remove `app.use(passport.initialize())` (line 73)
- [ ] Remove `configurePassport()` call (line 74)

**File:** `backend/config/passport.js`

**Decision:** Keep file empty hoặc delete? (Recommend: Delete nếu không dùng OAuth nào khác)

**Tasks:**
- [ ] Remove passport imports từ server.js
- [ ] Remove passport initialization
- [ ] Delete or simplify `backend/config/passport.js`
- [ ] Verify server starts without errors

---

### 2.3 Backend - Remove Dependencies

**File:** `backend/package.json`

**Remove:**
- [ ] Remove `"passport": "^0.6.0"`
- [ ] Remove `"passport-google-oauth20": "^2.0.0"`

**Tasks:**
- [ ] Remove dependencies từ package.json
- [ ] Run `npm install` để update lock file
- [ ] Verify no import errors

---

### 2.4 Frontend - Remove Google Login Button

**File:** `frontend/app/login/page.tsx`

**Remove:**
- [ ] Remove `googleLoading` state (line ~22)
- [ ] Remove `handleGoogleLogin` function (lines ~36-42)
- [ ] Remove Google OAuth error handling trong useEffect (lines ~25-34)
- [ ] Remove entire Google button JSX block (lines ~191-226):
  ```tsx
  // Remove this entire section:
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="bg-card px-3 text-muted-foreground uppercase tracking-wide">
        Or continue with
      </span>
    </div>
  </div>
  
  <Button variant="outline" ... onClick={handleGoogleLogin}>
    {/* Google button content */}
  </Button>
  ```

**Tasks:**
- [ ] Remove Google login button và related code
- [ ] Test login page renders correctly
- [ ] Verify no console errors

---

### 2.5 Frontend - Remove Google Signup Button

**File:** `frontend/app/register/page.tsx`

**Remove:**
- [ ] Remove `googleLoading` state (line ~34)
- [ ] Remove `handleGoogleLogin` function (lines ~36-41)
- [ ] Remove entire Google button JSX block (lines ~256-280)

**Tasks:**
- [ ] Remove Google signup button và related code
- [ ] Test register page renders correctly
- [ ] Verify no console errors

---

### 2.6 Frontend - Handle Auth Callback (Optional)

**File:** `frontend/app/auth/callback/page.tsx`

**Decision:** Delete nếu chỉ dùng cho Google OAuth, hoặc keep cho future OAuth

**Tasks:**
- [ ] Decide: Delete or keep
- [ ] If delete: Remove file completely
- [ ] If keep: Document purpose

---

### 2.7 User Model - Handle google_id Field

**File:** `backend/models/User.js`

**Decision:** Keep `google_id` field (backward compatible) - Option B from brainstorm

**Rationale:** Existing Google users có `google_id`, keep field để không break database

**Tasks:**
- [ ] Verify `google_id` field remains in model
- [ ] Document that field is deprecated but kept for compatibility
- [ ] No code changes needed

---

## Phase 3: Testing & Validation

### 3.1 Unit Tests for Validation Function

**Manual Testing:**
- [ ] Test valid emails: `@hcmute.edu.vn`, `@student.hcmute.edu.vn`, `@university.edu`
- [ ] Test invalid emails: `@gmail.com`, `@edulink.com`, `@education.org`
- [ ] Test edge cases: case sensitivity, whitespace, invalid format

**Integration Testing:**
- [ ] Register với valid email → Success, user created
- [ ] Register với invalid email → 400 error, user NOT created
- [ ] Register với `@edulink.com` → 400 error (must reject)
- [ ] Login với existing user → No validation, login succeeds
- [ ] Error message hiển thị correctly

**Tasks:**
- [ ] Create test checklist
- [ ] Test registration flow
- [ ] Test login flow (grandfather policy)
- [ ] Verify error messages
- [ ] Document test results

---

### 3.2 OAuth Removal Testing

**Verify:**
- [ ] Server starts without passport errors
- [ ] Register endpoint works
- [ ] Login endpoint works
- [ ] No Google OAuth routes accessible
- [ ] Frontend pages render without Google buttons
- [ ] No console errors in browser

**Tasks:**
- [ ] Test complete auth flow
- [ ] Verify OAuth removal doesn't break existing features
- [ ] Check for any remaining OAuth references

---

## Phase 4: Documentation & Cleanup

### 4.1 Code Documentation

**Files to Update:**
- [ ] Add JSDoc comments cho `isValidStudentEmail()` function
- [ ] Document grandfather policy trong register endpoint
- [ ] Document OAuth removal trong CHANGELOG or README

**Tasks:**
- [ ] Add inline documentation
- [ ] Update code comments
- [ ] Document policy decisions

---

### 4.2 README Updates

**File:** `README.md`

**Updates:**
- [ ] Remove Google OAuth from features list
- [ ] Update authentication section
- [ ] Document email validation requirement

**Tasks:**
- [ ] Update README.md
- [ ] Update API documentation nếu có

---

### 4.3 Cleanup

**Tasks:**
- [ ] Remove unused imports
- [ ] Remove commented code
- [ ] Clean up console.log statements nếu cần
- [ ] Verify no dead code

---

## Success Criteria

### Email Validation
- ✅ New registrations với invalid email bị block
- ✅ New registrations với valid email thành công
- ✅ Existing users login không bị ảnh hưởng
- ✅ Error message rõ ràng, user-friendly

### OAuth Removal
- ✅ Google OAuth routes removed
- ✅ Passport dependencies removed
- ✅ Frontend Google buttons removed
- ✅ No errors khi start server
- ✅ Authentication flow hoạt động bình thường

---

## Edge Cases & Considerations

### Email Validation Edge Cases
1. **Case sensitivity:** Handled - normalize to lowercase
2. **Whitespace:** Handled - trim before validation
3. **Missing @:** Handled - return false
4. **'edu' as domain:** `@edu.com` → Valid (edge case, acceptable)
5. **Subdomains:** `@student.hcmute.edu.vn` → Valid (correct)

### OAuth Removal Considerations
1. **Existing Google users:** Keep `google_id`, block Google login
2. **Password reset:** Remove OAuth check trong forgot-password
3. **Auth callback page:** Decide delete or keep
4. **Dependencies:** Remove passport packages

---

## Rollback Plan

**If issues arise:**
1. Revert email validation - remove validation check từ register
2. Re-add OAuth code from git history nếu cần
3. Re-install passport dependencies

**Precaution:**
- Commit sau mỗi phase
- Test thoroughly before moving to next phase

---

## Unresolved Questions

None - all questions resolved in brainstorm document.

---

## References

- Brainstorm: `plans/reports/brainstorm-251212-student-email-verification.md`
- Auth routes: `backend/routes/auth.js`
- User model: `backend/models/User.js`
- Frontend login: `frontend/app/login/page.tsx`
- Frontend register: `frontend/app/register/page.tsx`

