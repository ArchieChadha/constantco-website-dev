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
# Run the test suite
node tests/run-tests.js
```

## Future Considerations
- Advanced encryption for sensitive financial documents  
- Managing appointment overload and double-booking  
- Keeping resources updated  
- Ensuring performance across devices & browsers  


## License
⚠️ *This is a private academic project. Not licensed for public/commercial use unless agreed with the client.*
