# Test Results - Split Full Name into First Name / Last Name

## Test Context
- **Date**: 2026-02-07
- **Feature**: Split "Full Name" field into separate "First Name" and "Last Name" in student linking forms

## Implementation Summary

### Backend Changes
- Updated `StudentRecordCreate` model to accept `first_name` and `last_name` instead of `full_name`
- Updated `StudentRecordUpdate` model with `first_name` and `last_name` fields
- Added backward compatibility: old records with only `full_name` get auto-split into `first_name`/`last_name`
- New records compute `full_name` as `first_name + " " + last_name`
- All API responses now include `first_name`, `last_name`, and `full_name`

### Frontend Changes (3 forms updated)
1. `SchoolTextbooksView.jsx` - InlineStudentForm: Split into First Name + Last Name fields
2. `LinkingPage.jsx` - Dialog form: Split into First Name + Last Name fields
3. `MyStudentsSection.jsx` - Dialog form + Edit Profile Dialog: Split into First Name + Last Name fields
4. `AllStudentsTab.jsx` - Admin table: Shows separate First Name and Last Name columns

### Key Files
- `backend/modules/store/models/textbook_access.py` — Updated Pydantic models
- `backend/modules/store/services/textbook_access_service.py` — Added `_normalize_name_fields()` for backward compat
- `backend/modules/store/repositories/textbook_access_repository.py` — Added first_name/last_name to aggregation projection
- `backend/modules/store/routes/private_catalog.py` — Added first_name/last_name to catalog access response
- `frontend/src/modules/unatienda/components/SchoolTextbooksView.jsx` — Updated inline form
- `frontend/src/modules/account/linking/LinkingPage.jsx` — Updated dialog form
- `frontend/src/modules/account/students/MyStudentsSection.jsx` — Updated dialog + edit forms
- `frontend/src/modules/admin/users/components/AllStudentsTab.jsx` — Updated admin table

### Test Credentials
- Admin: admin@libreria.com / admin (password field)
- Admin login: POST /api/auth-v2/login with {"email":"admin@libreria.com","password":"admin"}

### API Endpoints
- POST /api/store/textbook-access/students - Create student (now accepts first_name, last_name)
- GET /api/store/textbook-access/my-students - Get user's students (returns first_name, last_name, full_name)
- PUT /api/store/textbook-access/students/{id} - Update student (accepts first_name, last_name)
- GET /api/store/textbook-access/admin/all-students - Admin view (returns first_name, last_name, full_name)

## Incorporate User Feedback
- Forms now have separate First Name and Last Name fields
- Backend maintains backward compatibility with existing records
- Admin table shows separate name columns for better sorting
