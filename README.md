# Maitree Shah - Architecture Portfolio

A professional, high-performance architecture portfolio designed to showcase design projects, technical skills, and professional experience.

## 🚀 Features
- **Dynamic Project Management**: Integrated Admin Panel to add, edit, or delete projects.
- **PDF Integration**: Seamlessly view project documentation and CVs via an embedded PDF viewer.
- **Local Persistence**: Utilizes **IndexedDB** for robust client-side data storage, allowing for large file handling (images/PDFs).
- **Modern UI**: Responsive design with a focus on typography and minimalist architectural aesthetics.
- **Privacy Focused**: Lucide icons are hosted locally to prevent tracking and ensure reliability.

## 🛠️ Tech Stack
- HTML5, CSS3 (Custom Variables)
- Vanilla JavaScript (ES6+)
- [Lucide Icons](https://lucide.dev/) (Local Distribution)
- IndexedDB API

## 🛠️ Setup & Customization
1. **Admin Access**: The default credentials are set in `index.html` under the `ADMIN` constant.
2. **Local Icons**: Ensure `js/lucide.min.js` is present in your project folder to avoid CDN blocking.
3. **Deployment**: This project is ready for deployment on **GitHub Pages**, **Netlify**, or **Vercel**.

### Deploying to GitHub Pages
1. Create a new public repository on GitHub.
2. Run these commands in your project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<username>/<repository-name>.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings > Pages**.
4. Set **Source** to "Deploy from a branch" and select `main`.
5. Your site will be live at `https://<username>.github.io/<repository-name>/`

---

© 2024 Maitree Shah. All rights reserved.