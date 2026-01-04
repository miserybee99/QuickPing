# Brainstorm: Student Email Verification Feature

**Date:** 2025-12-12  
**Feature:** Xác thực email sinh viên khi đăng ký/đăng nhập  
**Status:** Planning

---

## Problem Statement

Website QuickPing chỉ dành cho sinh viên. Cần xác minh người dùng có phải sinh viên hay không thông qua việc kiểm tra email domain của trường đại học khi đăng ký/đăng nhập.

**Requirements:**
- Chỉ cho phép email từ domain của trường đại học hợp lệ
- Tích hợp vào flow đăng ký/đăng nhập hiện tại
- Sử dụng infrastructure hiện có (School model, OTP system)

---

## Current System Analysis

### Existing Infrastructure

**✅ Strengths:**
- `School` model đã có sẵn với `domain` và `allowed_emails`
- User model có `school_id` reference (hiện tại optional)
- OTP email verification system đã hoạt động
- Email normalization đã được implement

**⚠️ Gaps:**
- Registration không validate email domain
- `school_id` có thể null
- Không có logic để match email domain với School

---

## Architecture Confirmation

**✅ Project QuickPing là 3-tiers architecture:**
- **Presentation Layer:** Frontend (Next.js 15)
- **Application Layer:** Backend (Express.js + Socket.io)
- **Data Layer:** MongoDB

---

## Clarifications & Decisions

**✅ Đã làm rõ:**

1. **Architecture:** 3-tiers ✅

2. **Email Validation Approach:** 
   - **Logic chính xác:** Check xem 'edu' có xuất hiện như một từ riêng biệt (exact match) trong domain
   - **Implementation:** Split domain bằng dấu chấm, check nếu có phần nào === 'edu'
   - **Ví dụ:**
     - `student@hcmute.edu.vn` → domain parts: `['hcmute', 'edu', 'vn']` → có 'edu' → ✅ Valid
     - `test@gmail.com` → domain parts: `['gmail', 'com']` → không có 'edu' → ❌ Invalid
     - `user@student.hcmute.edu.vn` → domain parts: `['student', 'hcmute', 'edu', 'vn']` → có 'edu' → ✅ Valid
     - `fake@edulink.com` → domain parts: `['edulink', 'com']` → không có 'edu' (chỉ có 'edulink') → ❌ Invalid
   - **Rejection:** Nếu email không hợp lệ → Block registration hoàn toàn, return error message

3. **Google OAuth:** 
   - **Quyết định:** Loại bỏ hoàn toàn tính năng Login with Google
   - **Lý do:** Đơn giản hóa hệ thống, chỉ focus vào email/password authentication

---

## Clarifying Questions (Resolved)

**Trước khi quyết định approach, cần làm rõ:**

1. **Scope của feature:**
   - ✅ Validation chỉ khi đăng ký (login không cần re-validate)
   - ⚠️ User đã tồn tại với email không hợp lệ - cần quyết định policy
   - ✅ Google OAuth sẽ bị remove nên không cần validate

2. **Policy:**
   - ✅ Cho phép nhiều trường (miễn domain có 'edu')
   - ✅ Không cần School model/whitelist - đơn giản hóa hoàn toàn
   - ✅ Không cần admin approval - automatic validation

3. **User Experience:**
   - Hiển thị error message gì khi email không hợp lệ?
   - Có suggest đúng domain không nếu typo?
   - Có cần preview danh sách schools được support không?

---

## Approach Options

### Option 1: Domain Whitelist (Simplest)

**Concept:** Lưu danh sách allowed domains trong School model, validate khi register.

**Implementation:**
```javascript
// Backend validation trong /auth/register
const emailDomain = normalizedEmail.split('@')[1];
const school = await School.findOne({ 
  domain: emailDomain,
  is_active: true 
});

if (!school) {
  return res.status(400).json({ 
    error: 'Email phải là email sinh viên hợp lệ',
    allowedDomains: await School.find({ is_active: true }).select('domain name')
  });
}

// Auto-assign school_id
user.school_id = school._id;
```

**Pros:**
- ✅ Đơn giản, implement nhanh (1-2 hours)
- ✅ Sử dụng School model có sẵn
- ✅ Tự động link user với school
- ✅ Dễ maintain (admin thêm/sửa domain trong DB)

**Cons:**
- ❌ Không flexible cho multiple domains per school
- ❌ Cần populate Schools trước
- ❌ Không handle subdomains tốt (e.g., `student.hcmute.edu.vn` vs `hcmute.edu.vn`)

**Best for:** Single school hoặc limited schools với domain rõ ràng.

---

### Option 2: Domain + Allowed Emails Hybrid

**Concept:** Match domain trước, fallback vào `allowed_emails` array nếu domain không match chính xác.

**Implementation:**
```javascript
const emailDomain = normalizedEmail.split('@')[1];
const emailLocal = normalizedEmail.split('@')[0];

// Try exact domain match first
let school = await School.findOne({ 
  domain: emailDomain,
  is_active: true 
});

// Fallback: check if email in allowed_emails
if (!school) {
  school = await School.findOne({ 
    allowed_emails: normalizedEmail,
    is_active: true 
  });
}

// Fallback: check subdomain patterns
if (!school) {
  const domainParts = emailDomain.split('.');
  // Try matching parent domain (e.g., hcmute.edu.vn from student.hcmute.edu.vn)
  for (let i = 1; i < domainParts.length; i++) {
    const parentDomain = domainParts.slice(i).join('.');
    school = await School.findOne({ 
      domain: parentDomain,
      is_active: true 
    });
    if (school) break;
  }
}

if (!school) {
  return res.status(400).json({ 
    error: 'Email không phải email sinh viên hợp lệ'
  });
}
```

**Pros:**
- ✅ Flexible cho edge cases
- ✅ Support subdomains
- ✅ Support specific email whitelist
- ✅ Backward compatible

**Cons:**
- ❌ Phức tạp hơn, nhiều queries
- ❌ Có thể chậm nếu nhiều schools
- ❌ Logic matching cần test kỹ

**Best for:** Multiple schools với domain patterns khác nhau.

---

### Option 3: Regex Pattern Matching

**Concept:** Mỗi School có regex pattern để match email domain.

**Schema Addition:**
```javascript
// School model
domain_pattern: {
  type: String,
  // e.g., "^.*@(student\\.)?hcmute\\.edu\\.vn$"
}
```

**Implementation:**
```javascript
const schools = await School.find({ is_active: true });
const matchedSchool = schools.find(school => {
  const pattern = school.domain_pattern || `^.*@${school.domain.replace(/\./g, '\\.')}$`;
  return new RegExp(pattern).test(normalizedEmail);
});

if (!matchedSchool) {
  return res.status(400).json({ error: 'Email không hợp lệ' });
}
```

**Pros:**
- ✅ Rất flexible cho complex patterns
- ✅ Support wildcards, optional parts
- ✅ Single query với filter

**Cons:**
- ❌ Regex khó maintain, dễ bug
- ❌ Không user-friendly cho admin
- ❌ Performance issue nếu nhiều patterns
- ❌ Overkill cho use case đơn giản

**Best for:** Complex requirements với nhiều domain variants.

---

### Option 4: Email Verification via School API (Future)

**Concept:** Tích hợp với SSO/Authentication system của trường để verify thực sự.

**Implementation:**
- Call school's API để verify email ownership
- Hoặc redirect qua OAuth/SAML của trường

**Pros:**
- ✅ Highest security, real verification
- ✅ Không thể fake

**Cons:**
- ❌ Phức tạp, cần partnership với trường
- ❌ Không phải trường nào cũng có API
- ❌ Slow, dependency external service
- ❌ Overkill cho MVP

**Best for:** Enterprise deployment, future enhancement.

---

## Final Recommended Solution: **Simplified Domain Check**

**Sau khi làm rõ requirements, approach cuối cùng:**

### Approach: Simple 'edu' Domain Validation

**Concept:** Check xem email domain có chứa substring 'edu' hay không.

**Implementation:**
```javascript
// Helper function - Check if email domain contains 'edu' as standalone word
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

// Usage in register endpoint
if (!isValidStudentEmail(normalizedEmail)) {
  return res.status(400).json({ 
    error: 'Email phải là email sinh viên hợp lệ (domain phải chứa "edu"). Ví dụ: student@hcmute.edu.vn'
  });
}
```

**Pros:**
- ✅ Cực kỳ đơn giản, không cần DB query
- ✅ Fast performance (no database lookup)
- ✅ Không cần maintain School whitelist
- ✅ Support nhiều trường tự động
- ✅ Easy to test và debug
- ✅ Exact match 'edu' - tránh false positive với 'edulink', 'education', etc.

**Cons:**
- ⚠️ Có thể miss edge cases (nhưng rare)
- ❌ Không biết user thuộc trường nào (nhưng có thể không cần cho MVP)

**Verdict:** ✅ Perfect cho MVP - đơn giản, fast, chính xác.

---

## Alternative: Previous Options (Đã loại bỏ)

### ~~Option 1: Domain Whitelist~~
**Status:** Không cần vì quá phức tạp cho requirement đơn giản

### ~~Option 2 (Hybrid)~~ - Đã replace bằng Simple Check

**Rationale:**
- Đơn giản tối đa - không cần DB, không cần config
- Fast - chỉ string operation
- Đủ tốt cho requirement: chỉ cần filter non-student emails

**Implementation Steps:**

### Phase 1: Email Validation Function
1. Create helper function `isValidStudentEmail(email)` trong `backend/routes/auth.js` hoặc utility file
2. Logic: Split domain by dots, check if any part === 'edu'
3. Test function với các test cases:
   - ✅ `student@hcmute.edu.vn` → Valid
   - ✅ `user@student.hcmute.edu.vn` → Valid
   - ❌ `test@gmail.com` → Invalid
   - ❌ `fake@edulink.com` → Invalid (phải reject)
   - ❌ `test@education.org` → Invalid (không có 'edu' standalone)

### Phase 2: Register Endpoint Update
1. Add validation vào `/auth/register` BEFORE checking existing user
2. Return clear error message: `"Email phải là email sinh viên hợp lệ (domain phải chứa 'edu'). Ví dụ: student@hcmute.edu.vn"`
3. Block registration hoàn toàn nếu email không hợp lệ (return 400 error)
4. Test registration flow với valid/invalid emails

### Phase 3: Remove Google OAuth (Complete Removal)
**Backend:**
1. Remove Google OAuth endpoints từ `backend/routes/auth.js`:
   - Remove `/auth/google`
   - Remove `/auth/google/callback`
   - Remove `/auth/google/status`
   - Remove error message về OAuth trong forgot-password endpoint
2. Remove passport imports và initialization từ `backend/routes/auth.js`
3. Remove passport config từ `backend/server.js`:
   - Remove `import passport from 'passport'`
   - Remove `import configurePassport`
   - Remove `app.use(passport.initialize())`
   - Remove `configurePassport()` call
4. **Option:** Delete hoặc simplify `backend/config/passport.js` (nếu không dùng OAuth nào khác)
5. Remove dependencies từ `backend/package.json`:
   - Remove `passport`
   - Remove `passport-google-oauth20`
6. **User Model:** Quyết định:
   - Option A: Remove `google_id` field (cần migration)
   - Option B: Keep field nhưng không dùng (backward compatible)

**Frontend:**
1. Remove Google login button từ `frontend/app/login/page.tsx`:
   - Remove `handleGoogleLogin` function
   - Remove `googleLoading` state
   - Remove Google button JSX
   - Remove OAuth error handling
2. Remove Google signup button từ `frontend/app/register/page.tsx`:
   - Remove `handleGoogleLogin` function
   - Remove `googleLoading` state
   - Remove Google button JSX
3. **Optional:** Delete `frontend/app/auth/callback/page.tsx` nếu chỉ dùng cho Google OAuth

### Phase 4: Testing & Edge Cases
1. Test với valid emails: `*.edu.*` patterns
2. Test với invalid emails
3. Handle existing users (grandfather policy?)
4. Update error messages nếu cần

---

## Implementation Considerations

### Database Changes

**No schema changes needed** - School model đã đủ:
```javascript
// School model hiện tại đã có:
domain: String (unique, indexed)
allowed_emails: [String]
is_active: Boolean
```

**Recommended Index:**
```javascript
// Đã có unique index trên domain - OK
// Có thể thêm index trên is_active nếu nhiều schools
db.schools.createIndex({ is_active: 1, domain: 1 })
```

### API Changes

**Register Endpoint:**
```javascript
// Before: No validation
// After: Validate domain, auto-assign school_id
// Error response: { error: '...', suggestedDomains: [...] }
```

**Login Endpoint:**
```javascript
// Option A: Strict - reject non-student emails
// Option B: Warning only - allow but mark as unverified
// Recommendation: Option B for existing users
```

### Frontend Changes

1. **Registration form:**
   - Show allowed domains hint
   - Real-time validation feedback
   - Error message với suggestion

2. **Settings page:**
   - Display current school
   - Allow change (with re-verification)

### Edge Cases

1. **Existing users without valid domain:**
   - **Decision needed:** Force re-verify hay grandfathered?
   - Recommendation: Grandfather existing, validate new only

2. **Google OAuth:** 
   - **REMOVED** - Không còn Google OAuth

3. **Multiple domains per school:**
   - Use `allowed_emails` array
   - Or multiple School records với same name

4. **Domain changes:**
   - Admin update School.domain
   - Users keep old school_id (audit trail)

---

## Security Considerations

1. **Email spoofing:** Domain validation không prevent email spoofing
   - **Mitigation:** OTP verification đã có sẵn ✅
   - Email OTP proves ownership

2. **Domain enumeration:** Error messages không expose all domains
   - Return generic error
   - Show domains only after failed attempt (rate limited)

3. **SQL injection:** Use parameterized queries (Mongoose handles ✅)

4. **Rate limiting:** Prevent domain validation abuse
   - Already have rate limiting for OTP ✅

---

## Testing Strategy

1. **Unit tests cho `isValidStudentEmail()`:**
   - ✅ Valid cases:
     - `student@hcmute.edu.vn` → true
     - `user@student.hcmute.edu.vn` → true
     - `test@university.edu` → true
     - `admin@school.edu.uk` → true
   - ❌ Invalid cases:
     - `test@gmail.com` → false
     - `fake@edulink.com` → false (must reject)
     - `user@education.org` → false (no standalone 'edu')
     - `test@edu.com` → true (edge case: 'edu' as domain)
   - Edge cases:
     - Case sensitivity: `STUDENT@HCMUTE.EDU.VN` → true
     - Whitespace: ` student@hcmute.edu.vn ` → true (after trim)
     - Invalid format: `notanemail` → false
     - Missing @: `hcmute.edu.vn` → false

2. **Integration tests:**
   - Register flow với valid email → success
   - Register flow với invalid email → 400 error, block registration
   - Register flow với `@edulink.com` → 400 error (must reject)
   - Login flow với existing users → không validate (grandfather policy)
   - Error message hiển thị đúng

3. **Manual testing:**
   - Test UI error message hiển thị
   - Test không thể submit form với invalid email
   - Test registration bị block hoàn toàn

---

## Success Metrics

1. **Adoption:**
   - % new registrations với valid domain
   - % users linked to schools

2. **User Experience:**
   - Registration rejection rate
   - Support tickets về domain issues

3. **Data Quality:**
   - % users with `school_id` populated
   - Consistency check: email domain vs school_id

---

## Migration Plan

1. **Phase 1: Soft launch**
   - Validate domain nhưng không block
   - Log warnings
   - Monitor rejection rate

2. **Phase 2: Enforce**
   - Block invalid domains
   - Backfill existing users (optional)

3. **Phase 3: Cleanup**
   - Remove users without valid domain (if policy)
   - Archive inactive schools

---

## Alternative: Simplified Option 1

**Nếu muốn fastest path:** Start với Option 1 (exact domain match only)

**Pros:**
- Implement trong 1-2 hours
- Test dễ dàng
- Có thể upgrade sang Option 2 sau

**Trade-off:**
- Cần ensure domains trong DB là exact match
- Không handle subdomains

**Decision:** Start simple, iterate based on feedback.

---

## Google OAuth Removal Plan

**Files cần modify:**

### Backend:
1. **`backend/routes/auth.js`**
   - Remove: `/auth/google` endpoint
   - Remove: `/auth/google/callback` endpoint  
   - Remove: `/auth/google/status` endpoint
   - Remove: Import passport
   - Remove: Error message về OAuth trong forgot-password

2. **`backend/config/passport.js`**
   - **Option A:** Delete entire file nếu không dùng OAuth khác
   - **Option B:** Keep file nhưng remove Google Strategy config

3. **`backend/server.js`**
   - Remove: `import passport from 'passport'`
   - Remove: `import configurePassport from './config/passport.js'`
   - Remove: `app.use(passport.initialize())`
   - Remove: `configurePassport()`

4. **`backend/models/User.js`**
   - **Option A:** Remove `google_id` field (cần migration cho existing data)
   - **Option B:** Keep field nhưng không dùng (backward compatible)

5. **`backend/package.json`**
   - Remove: `passport` dependency
   - Remove: `passport-google-oauth20` dependency

### Frontend:
1. **`frontend/app/login/page.tsx`**
   - Remove: Google login button
   - Remove: `handleGoogleLogin` function
   - Remove: `googleLoading` state
   - Remove: Google OAuth error handling

2. **`frontend/app/register/page.tsx`**
   - Remove: Google signup button
   - Remove: `handleGoogleLogin` function  
   - Remove: `googleLoading` state

3. **`frontend/app/auth/callback/page.tsx`**
   - **Option A:** Delete file nếu chỉ dùng cho Google OAuth
   - **Option B:** Keep nếu có thể dùng cho OAuth khác sau này

### Migration Considerations:
- Existing users với `google_id` không null: cần quyết định policy
- Users đã login bằng Google: cần force password reset hoặc allow?

---

## Open Questions (RESOLVED)

1. **✅ Policy:** Existing users với invalid domain - allow hay block?
   - **Decision:** Grandfather policy - cho phép existing users, chỉ validate new registrations
   - **Rationale:** Không ảnh hưởng users hiện tại, chỉ enforce cho users mới

2. **✅ Google OAuth removal:** Xử lý users đã đăng ký bằng Google?
   - **Decision:** Remove Google OAuth hoàn toàn
   - **Policy for existing Google users:** 
     - Option A (Recommended): Keep `google_id` field, nhưng block Google login. Users phải set password qua forgot-password
     - Option B: Force migration - không cho login cho đến khi set password
   - **Recommendation:** Option A - less disruptive

3. **✅ Error messaging:** Error message khi email không hợp lệ?
   - **Final:** `"Email phải là email sinh viên hợp lệ (domain phải chứa 'edu'). Ví dụ: student@hcmute.edu.vn"`
   - **Behavior:** Block registration hoàn toàn, return 400 status code

---

## Final Implementation Plan

### Phase 1: Email Validation (Priority: High)
- [ ] Create `isValidStudentEmail(email)` function
- [ ] Add validation vào `/auth/register` endpoint
- [ ] Return clear error message khi email không hợp lệ
- [ ] Block registration hoàn toàn nếu email invalid
- [ ] Test với test cases đã define

### Phase 2: Remove Google OAuth (Priority: High)
- [ ] Remove Google OAuth endpoints từ backend
- [ ] Remove passport imports và config
- [ ] Remove Google login buttons từ frontend
- [ ] Remove dependencies từ package.json
- [ ] Test authentication flow vẫn hoạt động

### Phase 3: Testing & Validation (Priority: Medium)
- [ ] Unit tests cho validation function
- [ ] Integration tests cho registration flow
- [ ] Manual testing với real email addresses
- [ ] Verify error messages hiển thị đúng

### Phase 4: Documentation & Cleanup (Priority: Low)
- [ ] Update API documentation
- [ ] Update README nếu cần
- [ ] Clean up unused code/comments

---

## Next Steps

1. ✅ **Decision:** Simplified 'edu' exact match validation
2. ✅ **Clarification:** All questions resolved
3. ✅ **Implementation plan:** Created above
4. **Ready for implementation:** Có thể bắt đầu code ngay

---

## References

- Current auth flow: `backend/routes/auth.js`
- School model: `backend/models/School.js`
- User model: `backend/models/User.js`
- OTP system: `backend/models/OTP.js`

