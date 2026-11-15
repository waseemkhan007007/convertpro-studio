# ConvertPro Studio

Local-first file conversion web app (React + FastAPI). **Current status: Phase 5** with working image-to-PDF, PDF-to-image, PDF merger, image merger, audio-to-MP3, video-to-MP4, and watermark cleanup tools. The broader converter suite continues in later phases.

## Run it (Windows PowerShell, from the project folder)

### Fastest way
```powershell
./start-dev.ps1
```
This opens a backend terminal and a frontend terminal for you automatically.

### Use from an Android phone
1. Connect the phone and the PC to the same private Wi-Fi network.
2. Run `./start-dev.ps1` on the PC. It opens both services and prints the exact local and LAN URLs, selecting another frontend port if 5173 is already in use.
3. On Android Chrome, open one of the printed LAN URLs. If Windows Firewall prompts, allow access on private networks only.
4. Keep both PC terminals running while you use the app. The browser frontend proxies API requests to the backend on the PC; conversions and FFmpeg processing happen on the PC, not the phone.

Do not expose the development server on a public network. The development frontend uses HTTP; production use from outside the local network needs a properly secured HTTPS deployment.

### Manual backend (terminal 1)
```powershell
cd backend
py -3.12 -m venv .venv          # only the first time
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item ..\.env.example ..\.env   # only the first time
uvicorn app.main:app --reload --port 8000
```
Check: http://127.0.0.1:8000/api/health

### Manual frontend (terminal 2)
```powershell
cd frontend
npm install                      # only the first time
npm run dev
```
Open: http://localhost:5173

### Ready tools
- Image to PDF
- PDF to Image
- PDF merger
- Image merger
- Audio to MP3
- Video to MP4
- Watermark remover (brush selection and local inpainting; results depend on image content)

See FILES_LOG.md for the list of files created in each phase.

## Deploy the frontend to Firebase Hosting

Firebase Hosting serves the frontend only; it does not run the Python conversion
backend. The site pages can be published without a backend, but conversion
tools need a separately deployed backend.

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. From the project root, install frontend dependencies and build the site:
   ```powershell
   cd frontend
   npm install
   npm run build
   cd ..
   ```
3. Install and sign in to the Firebase CLI, then deploy the built frontend:
   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase deploy --only hosting --project convertpro-studio
   ```

The root `firebase.json` serves `frontend/dist` and rewrites app routes to
`index.html`, so refreshing a page such as `/faq` continues to work.
