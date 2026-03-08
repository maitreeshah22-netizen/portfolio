  <script>
    // --- CONFIGURATION ---
    const ADMIN = { username: 'admin', password: 'admin123' };
    const PROFILE_KEY = 'archProfile';
    const PROJECTS_KEY = 'archProjects';
    const USE_FIREBASE = false;
    const dbRef = null;
    // ---------------------

    let isAdmin = sessionStorage.getItem('isAdmin') === 'true';

    // --- HARDCODED DATA ---
    // To make projects visible to everyone who opens your link, 
    // you can paste your exported project data here.
    const HARDCODED_PROJECTS = [];
    const HARDCODED_PROFILE = null;
    // ----------------------

    let editingProjectId = null;
    let tempCoverImage = '';
    let tempPdf = '';
    let tempCv = '';
    let tempHeroImage = '';
    let tempProfileImage = '';

    // Helper to handle admin button click based on state
    function handleAdminClick(e) {
      if (e) e.preventDefault();

      try {
        if (isAdmin) {
          const adminPanel = document.getElementById('admin-panel');
          if (adminPanel) {
            adminPanel.classList.add('active');
          }
        } else {
          const result = openLoginModal();
          if (!result) {
            console.error('Failed to open login modal');
          }
        }
      } catch (e) {
        console.error('Error in handleAdminClick:', e);
      }

      return false;
    }

    // Helper to open login modal with better debugging
    function openLoginModal() {
      try {
        const modal = document.getElementById('login-modal');
        if (!modal) {
          return false;
        }

        // Remove display: none style if it exists
        modal.style.display = '';
        modal.classList.add('active');

        // Force focus on username input
        setTimeout(() => {
          const userInput = document.getElementById('login-username');
          if (userInput) {
            userInput.focus();
          }
        }, 100);

        return true;
      } catch (e) {
        console.error('❌ Error opening login modal:', e);
        alert('Error: ' + e.message);
        return false;
      }
    }

    // IndexedDB Helper for large storage
    const DB_NAME = 'ArchPortfolioDB';
    const STORE_NAME = 'portfolioData';

    async function initDB() {
      return new Promise((resolve, reject) => {
        try {
          // Check if storage is actually accessible
          if (!window.indexedDB) {
            console.warn("IndexedDB not supported or blocked by privacy settings.");
            return resolve(null);
          }

          // Stable version for Netlify production
          const request = indexedDB.open(DB_NAME, 5);

          request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
          };

          request.onsuccess = () => resolve(request.result);
          request.onerror = (e) => {
            resolve(null);
          };
        } catch (e) {
          console.error("Storage access denied by browser:", e);
          resolve(null);
        }
      });
    }

    async function getData(key, defaultValue) {
      try {
        const db = await initDB().catch(() => null); if (!db) return defaultValue;
        return new Promise((resolve) => {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const request = transaction.objectStore(STORE_NAME).get(key);
          request.onsuccess = async () => {
            resolve(request.result !== undefined ? request.result : defaultValue);
          };
          request.onerror = () => resolve(defaultValue);
        });
      } catch (e) {
        console.error("Error retrieving data:", e);
        return defaultValue;
      }
    }

    async function setData(key, value) {
      try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const request = transaction.objectStore(STORE_NAME).put(value, key);
          request.onsuccess = () => resolve(true);
          request.onerror = (e) => {
            console.error("Error writing to IndexedDB:", e.target.error);
            reject(e.target.error);
          };
        });
      } catch (e) {
        console.error("Database transaction failed:", e);
        throw e;
      }
    }

    const defaultProfile = {
      name: "Maitree Shah",
      title: "Architect Student",
      email: "maitreeshah22@gmail.com",
      phone: "+91 83206 43376",
      address: "D-14 balgovind society near Darbar chokdi Manjalpur Vadodara -390011",
      bio: "With a vision to create meaningful architecture, our studio combines innovative design thinking with sustainable practices. Every project is an opportunity to shape spaces that enhance human experience.",
      cvPdf: "",
      stats: { projects: "5" },
      heroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      skills: [
        { name: "AutoCAD", level: 70 },
        { name: "SketchUp", level: 85 }
      ]
    };

    // Load data
    async function getProfile() {
      if (USE_FIREBASE && dbRef) {
        const snapshot = await dbRef.child('profile').once('value');
        if (snapshot.exists()) return snapshot.val();
      }
      const stored = await getData(PROFILE_KEY, null);
      return stored || HARDCODED_PROFILE || defaultProfile;
    }

    async function getProjects() {
      if (USE_FIREBASE && dbRef) {
        const snapshot = await dbRef.child('projects').once('value');
        if (snapshot.exists()) {
          const val = snapshot.val();
          return Array.isArray(val) ? val : Object.values(val);
        }
      }
      const projects = await getData(PROJECTS_KEY, null);
      return (projects && projects.length > 0) ? projects : HARDCODED_PROJECTS;
    }

    async function saveProfile(profile) {
      console.log("💾 Saving profile to database...");
      console.log("   Name:", profile.name);
      console.log("   Email:", profile.email);

      try {
        await setData(PROFILE_KEY, profile);
        console.log("✓ Profile saved to IndexedDB successfully");

        await renderProfile();
        console.log("✓ Profile rendered");

        return true;
      } catch (e) {
        console.error("❌ Error saving profile:", e);
        throw e;
      }
    }

    async function saveProjects(projects) {
      try {
        console.log("Saving projects list...");
        await setData(PROJECTS_KEY, projects);
        await renderProjects();
        await renderAdminProjects();
        return true;
      } catch (e) {
        showToast('Error saving project! Storage might be full.', 'error');
        return false;
      }
    }

    // Render
    async function renderProfile() {
      const profile = await getProfile();
      document.getElementById('nav-name').textContent = profile.name;
      document.getElementById('profile-name').textContent = profile.name;
      document.getElementById('profile-title').textContent = profile.title || "Architect Student";
      document.getElementById('profile-email').textContent = profile.email;
      document.getElementById('profile-phone').textContent = profile.phone;
      document.getElementById('profile-bio').textContent = profile.bio;
      document.getElementById('profile-address').textContent = profile.address;
      document.getElementById('profile-projects').textContent = profile.stats.projects;
      document.getElementById('hero-img-display').src = profile.heroImage || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";
      document.getElementById('footer-name').textContent = profile.name;
      document.getElementById('footer-copy-name').textContent = profile.name;

      const cvPlaceholder = document.getElementById('cv-placeholder');
      const cvStatus = document.getElementById('cv-status');
      const cvHint = document.getElementById('cv-hint');
      const viewCvBtn = document.getElementById('view-cv-btn');

      cvPlaceholder.innerHTML = '';
      if (profile.profileImage) {
        const img = document.createElement('img');
        img.src = profile.profileImage;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        cvPlaceholder.appendChild(img);

        const overlay = document.createElement('div');
        overlay.className = 'cv-overlay';
        overlay.style = 'position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s;';
        overlay.innerHTML = `<i data-lucide="maximize-2" style="color: white; width: 32px; height: 32px; margin-bottom: 8px;"></i><p style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">View CV</p>`;
        cvPlaceholder.appendChild(overlay);

        cvPlaceholder.onmouseenter = () => overlay.style.opacity = '1';
        cvPlaceholder.onmouseleave = () => overlay.style.opacity = '0';
      } else {
        cvPlaceholder.innerHTML = `<i data-lucide="user" style="width: 64px; height: 64px; color: var(--border);"></i><p style="color: var(--muted-foreground); font-size: 14px; margin-top: 12px;">No Profile Image</p>`;
      }

      viewCvBtn.style.display = 'inline-block';
      renderSkills(profile.skills || []);
      if (window.lucide) lucide.createIcons();
    }

    function renderSkills(skills) {
      const grid = document.getElementById('skills-grid');
      if (!grid) return;
      if (!skills || skills.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--muted-foreground);">No skills added yet.</p>';
        return;
      }
      grid.innerHTML = skills.map(s => {
        const safeName = (s.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeLevel = Math.max(0, Math.min(100, parseInt(s.level) || 0));
        return `
    <div class="skill-item">
      <div class="skill-header">
        <span class="skill-name">${safeName}</span>
        <span class="skill-perc">${safeLevel}%</span>
      </div>
      <div class="skill-bar-bg">
        <div class="skill-bar-fill" style="width: ${safeLevel}%"></div>
      </div>
    </div>
  `;
      }).join('');
    }

    async function renderProjects() {
      const projects = await getProjects();
      const grid = document.getElementById('projects-grid');

      if (!projects || projects.length === 0) {
        console.log('No projects found, showing empty state');
        const msg = isAdmin ? "Add your first project using the Admin Panel." : "Portfolio projects will appear here soon.";
        grid.innerHTML = `<div class="empty-state"><p style="font-size: 18px;">No projects found.</p><p style="margin-top: 8px; font-size: 14px;">${msg}</p></div>`;
        return;
      }

      console.log('Rendering', projects.length, 'projects...');

      grid.innerHTML = projects.map((p, index) => {
        console.log(`Project ${index + 1}:`, p.title);
        const safeTitle = (p.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const safeCategory = (p.category || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeLocation = (p.location || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeYear = (p.year || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeImage = (p.coverImage || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80').replace(/"/g, '&quot;');
        const safeId = (p.id || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return `
    <div class="project-card">
      <div class="project-card-image" data-project-id="${safeId}">
        <img src="${safeImage}" alt="${safeTitle}" style="width: 100%; height: auto; display: block;">
        <div class="project-overlay">
          <i data-lucide="file-text" style="width: 48px; height: 48px;"></i>
          <p>View PDF Document</p>
        </div>
        <div class="pdf-badge"><i data-lucide="file-text" style="width: 12px; height: 12px;"></i> PDF</div>
      </div>
      <div class="project-info">
        <p class="project-category">${safeCategory}</p>
        <h3 class="font-display project-title">${safeTitle}</h3>
        <p class="project-meta">${safeLocation}, ${safeYear}</p>
      </div>
    </div>
  `;
      }).join('');

      // Attach event listeners to project cards instead of inline onclick
      grid.querySelectorAll('.project-card-image').forEach(card => {
        card.addEventListener('click', function () {
          const projectId = this.getAttribute('data-project-id');
          openPdfViewer(projectId);
        });
        card.style.cursor = 'pointer';
      });

      // Reinitialize Lucide icons after rendering
      try {
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons();
        }
      } catch (e) {
        console.warn('Lucide icons failed to render:', e);
      }

      console.log('Projects rendered successfully');
      console.log('=== END RENDER ===');
    }

    async function renderAdminProjects() {
      const projects = await getProjects();
      const list = document.getElementById('admin-projects-list');

      console.log('=== RENDER ADMIN PROJECTS ===');
      console.log('Total projects in storage:', projects.length);
      console.log('Projects data:', projects);

      if (projects.length === 0) {
        console.log('No projects, showing empty state');
        list.innerHTML = '<p style="text-align: center; font-size: 12px; color: var(--muted-foreground);">No projects yet.</p>';
        return;
      }

      console.log('Rendering admin list with', projects.length, 'projects...');

      list.innerHTML = projects.map((p, index) => {
        console.log(`Admin Project ${index + 1}:`, p.title, 'ID:', p.id);
        const safeTitle = (p.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `
    <div class="admin-project-item" data-project-id="${p.id}">
      <span class="admin-project-name">${safeTitle}</span>
      <div class="admin-project-actions">
        <button class="edit" data-action="edit"><i data-lucide="edit"></i></button>
        <button class="delete" data-action="delete"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `;
      }).join('');

      // Attach event listeners to buttons instead of inline onclick
      list.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', function () {
          const projectId = this.closest('.admin-project-item').getAttribute('data-project-id');
          editProject(projectId);
        });
      });

      list.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', function () {
          const projectId = this.closest('.admin-project-item').getAttribute('data-project-id');
          deleteProject(projectId);
        });
      });

      try {
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons();
        }
      } catch (e) {
        console.warn('Lucide icons failed to render in admin:', e);
      }

      console.log('Admin projects rendered successfully');
      console.log('=== END ADMIN RENDER ===');
    }

    // Toast
    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast active ' + type;
      setTimeout(() => toast.classList.remove('active'), 3000);
    }

    // Mobile menu
    function toggleMobileMenu() {
      document.getElementById('mobile-menu').classList.toggle('active');
    }

    // Admin
    function updateAdminUI() {
      const btn = document.getElementById('admin-btn');
      const addContainer = document.getElementById('add-project-container');

      if (!btn) {
        console.error('❌ Admin button not found!');
        return;
      }

      console.log('Updating admin UI. isAdmin:', isAdmin);

      btn.textContent = isAdmin ? 'Admin Panel' : 'Admin Login';

      if (addContainer) {
        addContainer.style.display = isAdmin ? 'block' : 'none';
      }

      console.log('✓ Admin UI updated. Button text:', btn.textContent);
    }

    function closeAdminPanel() {
      document.getElementById('admin-panel').classList.remove('active');
    }

    function handleLogin(e) {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');

      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      console.log('🔐 Login attempt');
      console.log('   Username entered:', username);
      console.log('   Expected username:', ADMIN.username);
      console.log('   Passwords match:', password === ADMIN.password);

      if (username === ADMIN.username && password === ADMIN.password) {
        console.log('✓ Credentials valid - Setting admin state');
        isAdmin = true;
        sessionStorage.setItem('isAdmin', 'true');
        console.log('✓ Saved isAdmin to sessionStorage:', sessionStorage.getItem('isAdmin'));

        closeLoginModal();
        const panel = document.getElementById('admin-panel');
        if (panel) panel.classList.add('active');
        updateAdminUI();
        showToast('✓ Logged in as Admin', 'success');
        console.log('✓ Login successful and admin panel opened');
      } else {
        console.log('✗ Login failed - Invalid credentials');
        console.log('   Entered:', username, '/', password);
        console.log('   Expected:', ADMIN.username, '/', ADMIN.password);
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
          errorEl.style.display = 'block';
          errorEl.textContent = 'Invalid username or password';
        }
        showToast('Invalid credentials', 'error');
      }
    }

    function handleLogout() {
      isAdmin = false;
      sessionStorage.removeItem('isAdmin');
      closeAdminPanel();
      updateAdminUI();
      showToast('Logged out successfully', 'info');
    }

    function closeLoginModal() {
      console.log('Closing login modal...');
      const modal = document.getElementById('login-modal');

      if (modal) {
        modal.classList.remove('active');
        console.log('✓ Active class removed');
      } else {
        console.error('❌ Login modal not found!');
      }

      const username = document.getElementById('login-username');
      const password = document.getElementById('login-password');
      const errorMsg = document.getElementById('login-error');

      if (username) username.value = '';
      if (password) password.value = '';
      if (errorMsg) errorMsg.style.display = 'none';
    }

    // Project Modal
    async function openProjectModal(id = null) {
      editingProjectId = id ? Number(id) : null;
      tempCoverImage = '';
      tempPdf = '';

      const modal = document.getElementById('project-modal');
      const title = document.getElementById('project-modal-title');
      const deleteBtn = document.getElementById('delete-project-btn');

      if (id) {
        const projects = await getProjects();
        const numId = Number(id);
        const project = projects.find(p => p.id === numId);
        if (project) {
          title.textContent = 'Edit Project';
          document.getElementById('project-title').value = project.title;
          document.getElementById('project-category').value = project.category;
          document.getElementById('project-location').value = project.location;
          document.getElementById('project-year').value = project.year;
          document.getElementById('project-description').value = project.description;
          document.getElementById('cover-upload-text').textContent = 'Current cover (click to change)';
          document.getElementById('pdf-upload-text').textContent = 'Current PDF (click to change)';
          deleteBtn.style.display = 'inline-block';
          console.log('Editing project:', project.title);
        }
      } else {
        title.textContent = 'Add New Project';
        document.getElementById('project-title').value = '';
        document.getElementById('project-category').value = 'residential';
        document.getElementById('project-location').value = '';
        document.getElementById('project-year').value = new Date().getFullYear();
        document.getElementById('project-description').value = '';
        document.getElementById('cover-upload-text').textContent = 'Click to upload cover image';
        document.getElementById('pdf-upload-text').textContent = 'Click to upload PDF';
        deleteBtn.style.display = 'none';
        console.log('Opening new project form');
      }

      modal.classList.add('active');
    }

    function closeProjectModal() {
      const modal = document.getElementById('project-modal');
      modal.classList.remove('active');

      console.log('Closing project modal and resetting form...');

      // Reset form
      const form = modal.querySelector('form');
      if (form) {
        form.reset();
        console.log('Form reset');
      }

      // Clear file inputs specifically
      const coverInput = document.getElementById('project-cover');
      const pdfInput = document.getElementById('project-pdf');

      if (coverInput) {
        coverInput.value = '';
        console.log('Cover input cleared');
      }
      if (pdfInput) {
        pdfInput.value = '';
        console.log('PDF input cleared');
      }

      // Clear temporary variables
      tempCoverImage = '';
      tempPdf = '';
      editingProjectId = null;

      // Reset file input labels
      document.getElementById('cover-upload-text').textContent = 'Click to upload cover image';
      document.getElementById('pdf-upload-text').textContent = 'Click to upload PDF';

      // Reset form fields
      document.getElementById('project-title').value = '';
      document.getElementById('project-category').value = 'residential';
      document.getElementById('project-location').value = '';
      document.getElementById('project-year').value = new Date().getFullYear();
      document.getElementById('project-description').value = '';

      console.log('Project modal fully reset');
    }

    function handleCoverUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        tempCoverImage = ev.target.result;
        document.getElementById('cover-upload-text').textContent = 'Cover image selected';
        showToast('Cover image loaded!', 'success');
      };
      reader.readAsDataURL(file);
    }

    function handlePdfUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        tempPdf = ev.target.result;
        document.getElementById('pdf-upload-text').textContent = 'PDF selected';
        showToast('PDF loaded!', 'success');
      };
      reader.readAsDataURL(file);
    }

    async function handleProjectSubmit(e) {
      e.preventDefault();
      console.log('=== HANDLE PROJECT SUBMIT ===');

      const projects = await getProjects();
      console.log('Current projects before add:', projects.length);
      console.log('Currently stored projects:', projects.map(p => p.title));

      if (!tempPdf && !editingProjectId) {
        console.log('No PDF provided and not editing');
        showToast('Please upload a PDF file', 'error');
        return;
      }

      const existingProject = editingProjectId ? projects.find(p => p.id === editingProjectId) : null;

      const projectData = {
        id: editingProjectId || Date.now(),
        title: document.getElementById('project-title').value,
        category: document.getElementById('project-category').value,
        location: document.getElementById('project-location').value,
        year: parseInt(document.getElementById('project-year').value),
        description: document.getElementById('project-description').value,
        coverImage: tempCoverImage || (existingProject?.coverImage || ''),
        pdf: tempPdf || (existingProject?.pdf || '')
      };

      let newProjects;
      if (editingProjectId) {
        newProjects = projects.map(p => p.id === editingProjectId ? projectData : p);
        console.log('Updated existing project:', projectData.title);
      } else {
        newProjects = [...projects, projectData];
        console.log('Added new project:', projectData.title);
        console.log('Total projects after add:', newProjects.length);
      }

      console.log('Projects to be saved:', newProjects.map(p => p.title));
      if (await saveProjects(newProjects)) {
        closeProjectModal();
        showToast('Project saved!', 'success');
      }

      // Scroll to projects section to show the newly added project
      setTimeout(() => {
        const projectsSection = document.getElementById('projects');
        if (projectsSection) {
          projectsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);

      console.log('=== SUBMIT COMPLETE ===');
    }

    async function editProject(id) {
      closeAdminPanel();
      await openProjectModal(id);
    }

    async function deleteProject(id, skipConfirm = false) {
      if (skipConfirm || confirm('Delete this project?')) {
        const numId = Number(id);
        const projects = (await getProjects()).filter(p => p.id !== numId);
        console.log('Deleted project. Remaining projects:', projects.length);
        await saveProjects(projects);
        showToast('Project deleted', 'info');
      }
    }

    // Debug function to clear all data  
    async function clearAllData() {
      if (confirm('This will permanently delete all projects and profile data. Are you sure?')) {
        const db = await initDB();
        db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
        localStorage.removeItem(PROJECTS_KEY);
        localStorage.removeItem(PROFILE_KEY);
        location.reload();
      }
    }

    async function handleModalDelete() {
      if (editingProjectId && confirm('Are you sure you want to delete this project?')) {
        await deleteProject(editingProjectId, true);
        closeProjectModal();
      }
    }

    // Profile Modal
    async function openProfileModal() {
      const profile = await getProfile();
      tempCv = '';
      tempHeroImage = '';
      tempProfileImage = '';

      document.getElementById('edit-name').value = profile.name;
      document.getElementById('edit-title').value = profile.title || "Architect Student";
      document.getElementById('edit-bio').value = profile.bio || "";
      document.getElementById('edit-phone').value = profile.phone;
      document.getElementById('edit-address').value = profile.address;
      document.getElementById('cv-upload-text').textContent = profile.cvPdf ? 'Current CV (click to change)' : 'Click to upload CV PDF';
      document.getElementById('hero-upload-text').textContent = 'Click to upload hero image';
      document.getElementById('profile-image-upload-text').textContent = 'Click to upload profile image';

      const skillsList = document.getElementById('edit-skills-list');
      skillsList.innerHTML = '';
      if (profile.skills) {
        profile.skills.forEach(s => addSkillRow(s.name, s.level));
      }

      const preview = document.getElementById('cv-preview-container');
      const frame = document.getElementById('cv-preview-frame');
      if (profile.cvPdf) {
        preview.style.display = 'block';
        frame.src = profile.cvPdf;
      } else {
        preview.style.display = 'none';
        frame.src = '';
      }

      document.getElementById('profile-modal').classList.add('active');
    }

    function closeProfileModal() {
      document.getElementById('profile-modal').classList.remove('active');
    }

    function addSkillRow(name = '', level = 70) {
      const container = document.getElementById('edit-skills-list');
      const row = document.createElement('div');
      row.className = 'skill-row';
      row.style.cssText = 'display: grid; grid-template-columns: 1fr 80px 40px; gap: 12px; align-items: center;';

      // Create inputs with proper escaping
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'input-field form-input skill-name-input';
      nameInput.placeholder = 'Skill Name';
      nameInput.value = name;
      nameInput.style.padding = '8px';

      const levelInput = document.createElement('input');
      levelInput.type = 'number';
      levelInput.className = 'input-field form-input skill-level-input';
      levelInput.placeholder = '%';
      levelInput.value = level;
      levelInput.min = '0';
      levelInput.max = '100';
      levelInput.style.padding = '8px';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.style.color = 'var(--destructive)';
      deleteButton.innerHTML = '<i data-lucide="trash-2" style="width: 18px;"></i>';
      deleteButton.addEventListener('click', function () {
        row.remove();
      });

      row.appendChild(nameInput);
      row.appendChild(levelInput);
      row.appendChild(deleteButton);
      container.appendChild(row);
      if (window.lucide) lucide.createIcons();
    }

    function handleProfileImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        tempProfileImage = ev.target.result;
        document.getElementById('profile-image-upload-text').textContent = 'Profile image selected';
        // Update preview in modal if possible
        // Update preview icon color to show success
        const preview = document.querySelector('#profile-modal .file-upload i[data-lucide="image"]');
        if (preview) {
          preview.style.color = 'var(--primary)';
        }
        showToast('Profile image loaded!', 'success');
      };
      reader.readAsDataURL(file);
    }

    function handleHeroImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        tempHeroImage = ev.target.result;
        document.getElementById('hero-upload-text').textContent = 'Hero image selected';
        // Update preview icon color to show success
        const preview = document.querySelector('#profile-modal .file-upload i[data-lucide="image"]');
        if (preview) {
          preview.style.color = 'var(--primary)';
        }
        showToast('Hero image loaded!', 'success');
      };
      reader.readAsDataURL(file);
    }

    function handleCvUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        tempCv = ev.target.result;
        document.getElementById('cv-upload-text').textContent = 'CV PDF selected';
        const preview = document.getElementById('cv-preview-container');
        const frame = document.getElementById('cv-preview-frame');
        if (preview && frame) {
          preview.style.display = 'block';
          frame.src = ev.target.result;
        }
        showToast('CV loaded!', 'success');
      };
      reader.readAsDataURL(file);
    }

    async function handleProfileSubmit(e) {
      e.preventDefault();
      console.log('💾 Saving profile changes...');

      try {
        const currentProfile = await getProfile();

        const skillRows = document.querySelectorAll('.skill-row');
        const skills = Array.from(skillRows).map(row => ({
          name: row.querySelector('.skill-name-input').value,
          level: parseInt(row.querySelector('.skill-level-input').value) || 0
        })).filter(s => s.name.trim() !== '');

        const newProfile = {
          name: document.getElementById('edit-name').value || currentProfile.name,
          title: document.getElementById('edit-title').value || currentProfile.title,
          email: document.getElementById('edit-email').value || currentProfile.email,
          phone: document.getElementById('edit-phone').value || currentProfile.phone,
          address: document.getElementById('edit-address').value || currentProfile.address,
          bio: document.getElementById('edit-bio').value || currentProfile.bio,
          cvPdf: tempCv || currentProfile.cvPdf,
          stats: { projects: document.getElementById('edit-projects').value || currentProfile.stats.projects },
          heroImage: tempHeroImage || currentProfile.heroImage,
          profileImage: tempProfileImage || currentProfile.profileImage,
          skills: skills
        };

        console.log('Profile data to save:', newProfile);

        await saveProfile(newProfile);

        // Clear temp variables after successful save
        tempCv = '';
        tempHeroImage = '';
        tempProfileImage = '';
        console.log('✓ Profile saved successfully');

        await renderProfile();
        console.log('✓ Profile rendered');

        closeProfileModal();
        showToast('✓ Profile updated!', 'success');
      } catch (e) {
        console.error('❌ Error saving profile:', e);
        console.error('Error details:', e.message);
        showToast('Failed to save changes. Check console for details.', 'error');
      }
    }

    // PDF Viewer
    let currentPdfUrl = null;

    async function openPdfViewer(projectId) {
      const projects = await getProjects();
      const numId = Number(projectId);
      const project = projects.find(p => p.id === numId);
      if (!project || !project.pdf) return;

      try {
        const blob = base64ToBlob(project.pdf);
        currentPdfUrl = URL.createObjectURL(blob);

        // Mobile check: Open in new tab for better compatibility
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.open(currentPdfUrl, '_blank');
          return;
        }

        const frame = document.getElementById('pdf-frame');
        if (frame) frame.src = '';
        if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
        if (frame) frame.src = currentPdfUrl;
      } catch (e) {
        window.open(project.pdf, '_blank');
      }
      const viewer = document.getElementById('pdf-viewer');
      if (viewer) viewer.classList.add('active');
    }

    function closePdfViewer() {
      const viewer = document.getElementById('pdf-viewer');
      const frame = document.getElementById('pdf-frame');
      if (frame) frame.src = '';
      if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
      currentPdfUrl = null;
      viewer.classList.remove('active');
    }

    async function openCvViewer() {
      const profile = await getProfile();
      if (!profile.cvPdf) {
        if (isAdmin) openProfileModal();
        else showToast('CV not yet uploaded.', 'info');
        return;
      }

      try {
        const blob = base64ToBlob(profile.cvPdf);
        currentPdfUrl = URL.createObjectURL(blob);

        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.open(currentPdfUrl, '_blank');
          return;
        }

        const frame = document.getElementById('pdf-frame');
        if (frame) frame.src = '';
        if (frame) frame.src = currentPdfUrl;
      } catch (e) {
        window.open(profile.cvPdf, '_blank');
      }

      const viewer = document.getElementById('pdf-viewer');
      if (viewer) viewer.classList.add('active');
    }

    function base64ToBlob(base64) {
      if (!base64 || !base64.includes(';base64,')) return null;
      const parts = base64.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) uInt8Array[i] = raw.charCodeAt(i);
      return new Blob([uInt8Array], { type: contentType });
    }

    async function exportForSharing() {
      const projects = await getProjects();
      const code = `// PASTE THIS INTO YOUR index.html SCRIPT SECTION\nconst HARDCODED_PROJECTS = ${JSON.stringify(projects)};`;
      console.log(code);
      alert("Sharing code generated in browser console (F12). Copy it and paste it into the HARDCODED_PROJECTS variable in your index.html to make projects visible to everyone.");
      showToast('Check console for sharing code!', 'info');
    }

    // Contact
    function handleContactSubmit(e) {
      e.preventDefault();
      showToast('Message sent!', 'success');
      e.target.reset();
    }

    // Initialize
    console.log('=== PAGE INITIALIZATION ===');
    console.log('Checking localStorage and sessionStorage...');

    // Restore admin state from sessionStorage
    if (sessionStorage.getItem('isAdmin') === 'true') {
      isAdmin = true;
      console.log('✓ Admin state restored from sessionStorage');
    } else {
      isAdmin = false;
      console.log('Admin state: not logged in');
    }

    // Check what's in storage before rendering
    try {
      const initialProjects = localStorage.getItem(PROJECTS_KEY);
      console.log('Projects in localStorage:', initialProjects ? JSON.parse(initialProjects).length : 0, 'projects');
    } catch (e) {
      console.log('Projects in localStorage: 0 (parse error)');
    }

    async function init() {
      try {
        console.log('Starting initialization...');

        // Initialize Lucide icons
        try {
          if (window.lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
            console.log('✓ Lucide icons initialized');
          }
        } catch (e) {
          console.error('Initial Lucide icon creation failed:', e);
        }

        // Update admin UI with restored state
        updateAdminUI();
        console.log('✓ Admin UI updated');

        // Render all content
        await renderProfile();
        console.log('✓ Profile rendered');

        await renderProjects();
        console.log('✓ Projects rendered');

        await renderAdminProjects();
        console.log('✓ Admin projects rendered');

        console.log('✓ Initialization complete');
      } catch (e) {
        console.error('❌ Initialization failed:', e);
        console.error('Stack:', e.stack);
      }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    console.log('=== INITIALIZATION COMPLETE ===');

    // Show storage info
    async function showStorageInfo() {
      try {
        const projects = await getProjects();
        const profile = await getProfile();
        const projectsSize = JSON.stringify(projects).length / 1024;
        const profileSize = JSON.stringify(profile).length / 1024;

        console.log('========== STORAGE INFO ==========');
        console.log('Projects count:', projects.length);
        console.log('Projects size:', projectsSize.toFixed(2), 'KB');
        console.log('Profile size:', profileSize.toFixed(2), 'KB');
        console.log('Total size:', (projectsSize + profileSize).toFixed(2), 'KB');
        console.log('Projects:', projects.map(p => ({ title: p.title, id: p.id })));
        console.log('==================================');
      } catch (e) {
        console.error('Error checking storage:', e);
      }
    }

    // Debug helper function
    function debugAdmin() {
      console.log('========== ADMIN DEBUG INFO ==========');
      console.log('isAdmin (global):', isAdmin);
      console.log('sessionStorage.isAdmin:', sessionStorage.getItem('isAdmin'));
      console.log('ADMIN credentials:');
      console.log('  Username:', ADMIN.username);
      console.log('  Password:', ADMIN.password);
      console.log('Admin button exists:', !!document.getElementById('admin-btn'));
      console.log('Admin panel exists:', !!document.getElementById('admin-panel'));
      console.log('Login modal exists:', !!document.getElementById('login-modal'));
      console.log('=====================================');
    }
