# Sirmaalgram

A photo sharing app: sign up, log in, post photos, share 24-hour stories, watch reels, like, comment and follow people.

Stories accept photos and expire after 24 hours. Reels accept MP4 or WebM videos up to 25 MB.

## Run it
1. Install Node.js 18 or newer from nodejs.org (one time).
2. Open Terminal in this folder and run: `node server.js`
3. Open http://localhost:3000 in your browser.

Demo accounts (password 123456 for all): guuled, hodan, abdi, sagal.

## Folders
- `server.js`  the backend (API, login, storage)
- `public/`    the app screens (HTML, CSS, JavaScript)
- `data/db.json`  all data: users, posts, likes, comments, follows
- `uploads/`   photos
