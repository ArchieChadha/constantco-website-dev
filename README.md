# constantco-website-dev
Website development project for Constant &amp; Co, Melbourne. Features include online appointment scheduling, secure document upload, service showcase, client resources, testimonials, and admin dashboard.

## Project Overview
The goal of this project is to design and develop a professional, fully functional website for Constant & Co. The site will serve as the firm's primary online presence and provide:
- Online appointment scheduling
- Secure document upload portal
- Service showcase
- Client resources (FAQs, blogs, downloads)
- Testimonials and case studies
- Admin dashboard for internal management

The website will be mobile-friendly, SEO-optimized, and designed to reflect the professionalism and reliability of Constant & Co.


## Features
- ✅ Online booking system (with automated emails)
- ✅ Secure client portal with document upload
- ✅ Service listings & pricing details
- ✅ Blog & educational resources
- ✅ Testimonials & case studies
- ✅ SEO & digital marketing setup
- ✅ Admin dashboard for staff


## Project Members
- Archie Chadha – *30436129*  
- Abdul Kaiyum Tahsin – *30434113*  
- Divya Chhabra – *30414437*  
- Mohammad Ashraful Islam – *30430589*  
- Sajan Dhamala – *[Student ID]*  


## Client Information
- **Client:** Constant & Co  
- **Location:** Melbourne, Victoria  
- **Contact:** Mai Nguyen (mai@constantandco.com.au)  


## Setup Instructions

### Quick Start
```bash
# 1. Install dependencies
npm install
cd api && npm install && cd ..

# 2. Setup database (requires PostgreSQL)
./setup.sh

# 3. Configure environment
# Edit api/.env and add your PostgreSQL password

# 4. Start the server
cd api && node server.js

# 5. Open the website
open src/index.html
```

### Manual Setup
See `setup.md` for detailed instructions.

### Requirements
- Node.js (v14+)
- PostgreSQL (v12+)
- Modern web browser

## Testing
```bash
# Full suite: Vitest (DOM + optional API) + static HTML/CSS checks
npm test

# Optional: API integration tests (requires API on 127.0.0.1:3001 and tests/.api-up containing 1)
# echo 1 > tests/.api-up && npx vitest run tests/api.integration.test.js --config vitest.config.mjs

# Static checks only
npm run test:basic
```

Case-style IDs (AP-, CP-, CL-, API-, FE-) appear in Vitest test names in `tests/*.test.js` and in the Part 1 static checks in `tests/basic-tests.cjs`.

**Why you might not see `5/5`:** That summary comes from **Part 1** (`basic-tests.cjs`). It only runs when you use **`npm test`** (full suite). If you run **`npm run test:vitest`** or **`npx vitest`** alone, you only get Vitest’s output (`Tests N passed`), not the static `5/5` suites.

## Future Considerations
- Advanced encryption for sensitive financial documents  
- Managing appointment overload and double-booking  
- Keeping resources updated  
- Ensuring performance across devices & browsers  


## License
⚠️ *This is a private academic project. Not licensed for public/commercial use unless agreed with the client.*
