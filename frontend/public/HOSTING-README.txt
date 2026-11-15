ConvertPro Studio static website

UPLOAD
1. Extract this ZIP into the document root of your static hosting account
   (often named public_html, www, or public).
2. Keep index.html, the assets folder, and the hosting files together at the
   document root. Do not upload the ZIP without extracting it unless your host
   specifically supports ZIP deployment.
3. The included _redirects file supports Netlify-style hosts. The included
   .htaccess file supports Apache hosting and keeps app pages working on refresh.

IMPORTANT: CONVERSION BACKEND
This upload contains the website frontend only. File conversions require the
separate ConvertPro Studio Python/FastAPI backend. Until that backend is
deployed and connected, the site can display its pages but conversion tools
will not process files.

For an online backend, build the frontend with VITE_API_BASE_URL set to the
backend's API base URL (for example, https://api.example.com/api), and configure
the backend to allow requests from this website's HTTPS origin. The backend
also requires its Python dependencies and FFmpeg for audio/video conversions.
