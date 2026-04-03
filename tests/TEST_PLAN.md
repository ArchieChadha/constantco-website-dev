# Constant & Co — test plan (admin portal → client portal → API)

Automated cases below map to Vitest (`tests/*.test.js`) and static checks (`tests/basic-tests.cjs`). Backend integration tests run only when `tests/.api-up` exists and contains `1` (API listening on `127.0.0.1:3001` with a healthy database).

## Admin portal (HTML / localStorage UI)

| TC# | Test case | Expected behaviour |
| --- | --- | --- |
| AP-01 | Verify login screen and email/password fields are present | `#loginScreen`, `#loginForm`, `#loginEmail`, `#loginPassword` exist on `admin-portal.html` |
| AP-02 | Verify admin app shell and dashboard page exist in markup | `#adminApp` and `#page-dashboard` are present |
| AP-03 | Verify sidebar navigation labels | Buttons include Dashboard, Clients, Billing, Appointments, Admin Management |
| AP-04 | Verify stat targets and logout for dashboard JS | `#statClients`, `#statInvoices`, `#statAppointments`, `#logoutBtn` exist |
| AP-05 | Verify all main page sections exist | `#page-clients`, `#page-billing`, `#page-appointments`, `#page-admins` exist |

## Client portal (client dashboard HTML)

| TC# | Test case | Expected behaviour |
| --- | --- | --- |
| CP-01 | Verify welcome banner client name hook | `#dashName` is present |
| CP-02 | Verify profile fields | `#profileName`, `#profileEmail`, `#profilePhone`, `#profileType` exist |
| CP-03 | Verify services and records containers | `#servicesList`, `#recordsList` exist |
| CP-04 | Verify charges section | `bookingFeeValue`, `totalChargeValue`, `chargeValue`, `chargeStatus` exist |
| CP-05 | Verify upload form for API | `#uploadForm`, `#uploadStatus` exist |

## Client auth pages

| TC# | Test case | Expected behaviour |
| --- | --- | --- |
| CL-01 | Verify login form fields | `#loginForm`, `#email`, `#password`, `#loginStatus` on `login.html` |
| CL-02 | Verify signup form fields | `#signupForm`, `#fullName`, `#email`, `#password` on `signup.html` |
| CL-03 | Verify login links to signup, forgot password, admin | Markup references `signup.html`, `forgot-password.html`, `admin-portal.html` |

## Public site (static checks)

| TC# | Test case | Expected behaviour |
| --- | --- | --- |
| FE-01 | Home page HTML structure | DOCTYPE, `lang="en"`, `title` contains Constant & Co, `<main>` exists |
| FE-02 | Stylesheet link | `index.html` links `style.css` |
| FE-03 | CSS file conventions | `style.css` non-empty, `:root` variables, `@media`, flex/grid |
| FE-04 | Accessibility basics | Skip link to `#main`, images with alt, `h1`, `header`/`main`/`footer` |
| FE-05 | Content regions | Nav, `#services`, `#contact`, footer exist |

## API (Express + Postgres) — optional integration

Enable: start API (`cd api && node server.js` or your process manager), then `echo 1 > tests/.api-up` from repo root.

| TC# | Test case | Expected behaviour |
| --- | --- | --- |
| API-01 | Health endpoint | `GET /api/health` returns HTTP 200 when DB is up |
| API-02 | Newsletter validation | `POST /api/newsletter` with invalid email returns 400 |
| API-03 | Signup password rule | `POST /api/signup` with weak password returns 400 |
| API-04 | Contact required fields | `POST /api/contact` with missing fields returns 400 |
| API-05 | Login unknown user | `POST /api/login` with unknown email returns 401 when DB healthy |
| API-06 | Profile query | `GET /api/profile` without `clientId` returns 400 |
| API-07 | Admin billing PUT | `PUT /api/admin/billing/:id` without `clientId` returns 400 |
| API-08 | Upload endpoint | `POST /api/upload` with no file returns 400 |

## Manual smoke (not automated)

| Step | Action | Expected |
| --- | --- | --- |
| M-01 | Open `admin-portal.html`, log in with demo credentials | Dashboard visible; stats render; navigation switches pages |
| M-02 | Open `login.html`, sign in with a real portal user | Redirects to `client-dashboard.html`; profile loads from API when backend running |
| M-03 | Upload a PDF on client dashboard | Success or clear error from `/api/upload` |

Remove `tests/.api-up` when API is stopped so CI does not hang on network calls.
