// js/script.js

// ==============================================
// CONFIGURATION
// ==============================================
let USE_MOCK_DATA = true; 
const API_URL = 'backend/api.php'; 
const TIMEOUT_MS = 5000; 

// --- STATE ---
let listings = [];
let blogs = [];
let applications = [];
let quillEditor = null; 
let isAdminLoggedIn = false; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        AOS.init({ duration: 800, once: true, offset: 100 });
    } catch (e) { console.warn("Animation Error"); }
    
    // Editor Setup
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
        quillEditor = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Write your full blog content here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'font': [] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });
    }

    try { injectApplicationsUI(); } catch (e) {}
    loadData();
});

// --- LOGO ANIMATION ---
function animateLogo(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.classList.add('logo-click-anim');
    setTimeout(() => { window.location.href = 'index.html'; }, 300);
}

// --- OPEN BLOG IN MODAL ---
function openBlog(id) {
    const blog = blogs.find(b => b.id == id);
    if (!blog) return;

    document.getElementById('readBlogTitle').innerText = blog.title;
    document.getElementById('readBlogMeta').innerHTML = `
        <span class="flex items-center"><i class="fa-regular fa-calendar mr-2"></i>${blog.date}</span>
        <span class="text-gray-300">|</span>
        <span class="flex items-center"><i class="fa-regular fa-user mr-2"></i>${blog.author}</span>
    `;
    
    // Image Handling
    const imgContainer = document.getElementById('readBlogImageContainer');
    const imgTag = document.getElementById('readBlogImage');
    if (blog.image && blog.image.trim() !== "") {
        imgTag.src = blog.image;
        imgTag.onerror = function() { imgContainer.classList.add('hidden'); }; 
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }

    document.getElementById('readBlogContent').innerHTML = blog.content || blog.excerpt;
    document.getElementById('readBlogModal').classList.remove('hidden');
}

// --- SECURE ADMIN LOGIC ---
function toggleAdminPanel() {
    const adminView = document.getElementById('adminView');
    if (adminView.classList.contains('hidden')) {
        if (!isAdminLoggedIn) {
            document.getElementById('adminLoginModal').classList.remove('hidden');
        } else {
            showAdminView();
        }
    } else {
        const userView = document.getElementById('userView');
        const btn = document.getElementById('adminToggleBtn');
        adminView.classList.add('hidden');
        adminView.classList.remove('flex');
        userView.classList.remove('hidden');
        btn.innerText = 'Admin';
        loadData();
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;

    if (user === 'huzaifarao969' && pass === 'Huzaifa@@@969') {
        isAdminLoggedIn = true;
        document.getElementById('adminLoginModal').classList.add('hidden');
        e.target.reset();
        showAdminView();
    } else {
        alert('Wrong Username or Password! Access Denied.');
    }
}

function showAdminView() {
    const u = document.getElementById('userView');
    const a = document.getElementById('adminView');
    const btn = document.getElementById('adminToggleBtn');
    u.classList.add('hidden');
    a.classList.remove('hidden');
    a.classList.add('flex');
    btn.innerText = 'Exit Admin';
    switchAdminTab('listings');
}

// --- DATA ENGINE ---
async function loadData() {
    const grid = document.getElementById('listingGrid');
    if(grid) grid.innerHTML = '<div class="col-span-3 text-center py-20"><i class="fa-solid fa-circle-notch fa-spin text-4xl text-blue-600"></i><p class="mt-4 text-gray-500 font-medium">Loading...</p></div>';
    
    try {
        if (USE_MOCK_DATA) {
            loadFromLocalStorage(); 
        } else {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS));
            
            const resListings = await Promise.race([fetch(`${API_URL}?action=get_listings`), timeout]);
            listings = await resListings.json();

            const resBlogs = await Promise.race([fetch(`${API_URL}?action=get_blogs`), timeout]);
            blogs = await resBlogs.json();

            try {
                const resApps = await Promise.race([fetch(`${API_URL}?action=get_applications`), timeout]);
                if(resApps.ok) applications = await resApps.json();
            } catch(e) {}
        }
    } catch (error) {
        console.error("Using Local Data");
        USE_MOCK_DATA = true; 
        loadFromLocalStorage();
    } finally {
        renderListings(listings);
        renderBlogs(blogs);
        if(document.getElementById('adminView') && !document.getElementById('adminView').classList.contains('hidden')) {
            renderAdminListings();
            renderAdminBlogs();
            renderAdminApplications();
        }
    }
}

// --- LOCAL STORAGE ---
function loadFromLocalStorage() {
    try {
        const l = localStorage.getItem('scholarship_listings');
        listings = l ? JSON.parse(l) : getMockListings();
        const b = localStorage.getItem('scholarship_blogs');
        blogs = b ? JSON.parse(b) : getMockBlogs();
        const a = localStorage.getItem('scholarship_applications');
        applications = a ? JSON.parse(a) : getMockApplications();
    } catch (e) { console.warn("Reset"); }
}
function saveToLocalStorage() {
    if(USE_MOCK_DATA) {
        localStorage.setItem('scholarship_listings', JSON.stringify(listings));
        localStorage.setItem('scholarship_blogs', JSON.stringify(blogs));
        localStorage.setItem('scholarship_applications', JSON.stringify(applications));
    }
}

// --- READ MORE & SEARCH ---
function handleReadMore(blogId) {
    if (blogId && blogId !== "" && blogId !== "null") {
        openBlog(blogId);
    } else {
        const section = document.getElementById('blogs');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
}

function searchAndScroll() {
    filterListings();
    const section = document.getElementById('opportunities');
    if(section) section.scrollIntoView({ behavior: 'smooth' });
}

function filterListings() {
    const searchInput = document.getElementById('searchInput');
    if(!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    
    if(query === "") {
        renderListings(listings); 
        renderBlogs(blogs); 
        return;
    }

    const filteredListings = listings.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) || 
        (item.university && item.university.toLowerCase().includes(query)) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query))
    );
    renderListings(filteredListings);

    const filteredBlogs = blogs.filter(blog => 
        (blog.title && blog.title.toLowerCase().includes(query)) || 
        (blog.author && blog.author.toLowerCase().includes(query)) || 
        (blog.excerpt && blog.excerpt.toLowerCase().includes(query))
    );
    renderBlogs(filteredBlogs);
}

// --- RENDER FUNCTIONS ---
function renderListings(data) {
    const grid = document.getElementById('listingGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if(!data || data.length === 0) { 
        grid.innerHTML = '<div class="col-span-3 text-center py-10 bg-white rounded-xl border border-dashed border-gray-300"><p class="text-gray-500">No opportunities match your search.</p></div>'; 
        return; 
    }

    data.forEach((item, index) => {
        const isJob = item.type === 'Job';
        const hasBlog = item.linkedBlogId && item.linkedBlogId !== "";
        const readMoreAction = `handleReadMore('${item.linkedBlogId || ""}')`;

        grid.innerHTML += `
            <div data-aos="fade-up" data-aos-delay="${index * 50}" class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col h-full group hover:-translate-y-1 transition hover:shadow-2xl">
                <div class="flex justify-between items-start mb-4">
                    <div class="text-3xl ${isJob ? 'text-purple-600' : 'text-blue-600'} bg-gray-50 p-2 rounded-lg group-hover:bg-${isJob ? 'purple' : 'blue'}-600 group-hover:text-white transition"><i class="fa-solid ${isJob ? 'fa-briefcase' : 'fa-graduation-cap'}"></i></div>
                    <span class="text-[10px] font-bold px-3 py-1 rounded-full ${isJob ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} uppercase tracking-wider">${item.type}</span>
                </div>
                <h3 class="text-xl font-bold mb-2 text-gray-800 line-clamp-2">${item.title}</h3>
                <p class="text-gray-500 text-sm mb-4 flex items-center"><i class="fa-solid fa-location-dot mr-2 text-gray-400"></i> ${item.university}</p>
                <div class="mt-auto pt-4 border-t border-gray-100 text-sm">
                    <div class="flex justify-between mb-2"><span class="text-gray-500">Amount:</span> <span class="font-bold text-green-600">${item.amount}</span></div>
                    <div class="flex justify-between mb-4"><span class="text-gray-500">Deadline:</span> <span class="font-bold text-red-500">${item.deadline}</span></div>
                    <div class="flex gap-2">
                        <button onclick="openApplyModal()" class="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-lg transition shadow-sm btn-shine">Apply Now</button>
                        <button onclick="${readMoreAction}" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-lg transition shadow-sm border border-gray-200" title="${hasBlog ? 'Read Related Blog' : 'View All Blogs'}">Read More</button>
                    </div>
                </div>
            </div>`;
    });
}

function renderBlogs(data) {
    const grid = document.getElementById('blogGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if(!data || data.length === 0) { 
        grid.innerHTML = '<div class="col-span-3 text-center py-10 bg-white rounded-xl border border-dashed border-gray-300"><p class="text-gray-500">No blogs match your search.</p></div>'; 
        return; 
    }

    data.forEach((b, index) => {
        let imgHTML = '';
        if(b.image && b.image.trim() !== '') {
            imgHTML = `<div class="h-48 w-full overflow-hidden mb-4 rounded-lg relative"><img src="${b.image}" alt="${b.title}" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-700" onerror="this.style.display='none'"></div>`;
        }

        grid.innerHTML += `
            <div onclick="openBlog(${b.id})" data-aos="zoom-in" data-aos-delay="${index * 50}" class="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 transition cursor-pointer hover:shadow-lg group flex flex-col h-full">
                ${imgHTML}
                <div class="text-xs text-blue-500 font-bold mb-3 uppercase flex justify-between tracking-wide"><span>${b.date}</span><span>${b.author}</span></div>
                <h4 class="font-bold text-xl mb-3 text-gray-800 group-hover:text-blue-600 transition line-clamp-2">${b.title}</h4>
                <p class="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">${b.excerpt}</p>
                <div class="mt-auto text-blue-600 text-sm font-bold group-hover:translate-x-1 transition-transform inline-block">Read Full Article &rarr;</div>
            </div>`;
    });
}

// --- NEW EDIT FUNCTIONALITY ---
function editItem(type, id) {
    if(type === 'listing') {
        const item = listings.find(i => i.id == id);
        if(!item) return;
        
        // Open Modal & Populate
        openAddModal();
        document.getElementById('modalTitleListing').innerText = "Edit Listing";
        const form = document.querySelector('#addModal form');
        
        form.id.value = item.id;
        form.type.value = item.type;
        form.title.value = item.title;
        form.category.value = item.category;
        form.amount.value = item.amount;
        form.university.value = item.university;
        form.deadline.value = item.deadline;
        form.linkedBlogId.value = item.linkedBlogId || "";
        
    } else if (type === 'blog') {
        const item = blogs.find(i => i.id == id);
        if(!item) return;
        
        // Open Modal & Populate
        openAddBlogModal();
        document.getElementById('modalTitleBlog').innerText = "Edit Blog";
        const form = document.querySelector('#addBlogModal form');
        
        form.id.value = item.id;
        form.title.value = item.title;
        form.author.value = item.author;
        form.excerpt.value = item.excerpt;
        
        if(quillEditor) quillEditor.root.innerHTML = item.content || "";
    }
}

// --- ADMIN ACTIONS (Updated for Edit) ---
async function addBlog(e) {
    e.preventDefault();
    const form = e.target;
    let content = form.excerpt.value; 
    if(quillEditor) content = quillEditor.root.innerHTML;

    // Image Upload Logic
    const fileInput = document.getElementById('blogImageInput');
    const file = fileInput.files[0];

    const finalizeSave = async (imgUrl) => {
        // Check if Editing
        const editId = form.id.value;
        const isEdit = editId && editId !== "";
        
        let existingImg = "";
        if(isEdit) {
            const oldItem = blogs.find(i => i.id == editId);
            if(oldItem) existingImg = oldItem.image;
        }

        const newBlog = { 
            id: isEdit ? parseInt(editId) : Date.now(), 
            title: form.title.value, 
            author: form.author.value,
            image: imgUrl || existingImg, // Use new or keep old
            excerpt: form.excerpt.value, 
            content: content, 
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
        };

        if(isEdit) {
            // Update Array
            const index = blogs.findIndex(i => i.id == editId);
            if(index !== -1) blogs[index] = newBlog;
            alert("Blog Updated!");
        } else {
            // Add New
            blogs.unshift(newBlog); 
            alert("Blog Published!");
        }

        if(!USE_MOCK_DATA) {
            // Live update logic would go here
        }
        
        saveToLocalStorage(); 
        closeModal('addBlogModal'); 
        form.reset(); 
        form.id.value = ""; // Clear ID
        if(quillEditor) quillEditor.setContents([]); 
        loadData();
    };

    if (file) {
        const reader = new FileReader();
        reader.onloadend = function() { finalizeSave(reader.result); };
        reader.readAsDataURL(file);
    } else {
        finalizeSave(""); 
    }
}

async function addListing(e){
    e.preventDefault();
    const f=e.target;
    const editId = f.id.value;
    const isEdit = editId && editId !== "";

    const n={
        id: isEdit ? parseInt(editId) : Date.now(),
        type:f.type.value,
        title:f.title.value,
        category:f.category.value,
        amount:f.amount.value,
        university:f.university.value,
        deadline:f.deadline.value,
        linkedBlogId: f.linkedBlogId.value
    };
    
    if(isEdit) {
        const index = listings.findIndex(i => i.id == editId);
        if(index !== -1) listings[index] = n;
        alert("Listing Updated!");
    } else {
        listings.unshift(n);
        alert("Listing Added!");
    }

    saveToLocalStorage();
    closeModal('addModal');
    f.reset();
    f.id.value = ""; // Clear ID
    loadData();
}

function populateBlogSelect() {
    const select = document.getElementById('linkBlogSelect');
    if(!select) return;
    select.innerHTML = '<option value="">-- No Linked Blog (Scroll to section) --</option>';
    blogs.forEach(blog => {
        const option = document.createElement('option');
        option.value = blog.id;
        option.text = blog.title;
        select.appendChild(option);
    });
}

// ... other helpers ...
async function deleteItem(t,id){if(!confirm('Delete?'))return;if(t==='listing')listings=listings.filter(i=>i.id!==id);if(t==='blog')blogs=blogs.filter(i=>i.id!==id);if(t==='application')applications=applications.filter(i=>i.id!==id);saveToLocalStorage();loadData();switchAdminTab(t+'s');}
async function submitApplication(e) {e.preventDefault();const f=e.target;applications.unshift({id:Date.now(),full_name:f.full_name.value,email:f.email.value,statement:f.statement.value});saveToLocalStorage();document.getElementById('applyFormContainer').classList.add('hidden');document.getElementById('applySuccessContainer').classList.remove('hidden');f.reset();}
function injectApplicationsUI() { const n=document.querySelector('#adminView nav');if(n&&!document.getElementById('btn-nav-apps')){const b=document.createElement('button');b.id='btn-nav-apps';b.className='admin-nav-btn w-full text-left py-3 px-4 rounded hover:bg-gray-800 transition text-gray-400';b.innerText='Applications';b.onclick=()=>switchAdminTab('applications');n.appendChild(b);}const d=document.getElementById('adminListingsContent');if(d&&!document.getElementById('adminAppsContent')){const c=document.createElement('div');c.id='adminAppsContent';c.className='hidden';c.innerHTML=`<h2 class="text-2xl font-bold mb-6">Applications</h2><div class="bg-white rounded shadow overflow-auto"><table class="w-full text-left"><thead class="bg-gray-50"><tr><th class="p-4">Name</th><th class="p-4">Email</th><th class="p-4">Statement</th><th class="p-4">Action</th></tr></thead><tbody id="adminAppsTableBody"></tbody></table></div>`;d.parentNode.appendChild(c);}}
function switchAdminTab(t){['listings','blogs','apps'].forEach(k=>document.getElementById(`admin${k.charAt(0).toUpperCase()+k.slice(1)}Content`)?.classList.add('hidden'));document.querySelectorAll('.admin-nav-btn').forEach(b=>{b.classList.remove('bg-blue-600','text-white');b.classList.add('text-gray-400')});let a;if(t==='listings'){document.getElementById('adminListingsContent').classList.remove('hidden');a=document.getElementById('btn-nav-listings');renderAdminListings()}if(t==='blogs'){document.getElementById('adminBlogsContent').classList.remove('hidden');a=document.getElementById('btn-nav-blogs');renderAdminBlogs()}if(t==='applications'){document.getElementById('adminAppsContent').classList.remove('hidden');a=document.getElementById('btn-nav-apps');renderAdminApplications()}if(a){a.classList.add('bg-blue-600','text-white');a.classList.remove('text-gray-400')}}

// Updated Render with Edit Buttons
function renderAdminListings(){const t=document.getElementById('adminTableBody');if(t){t.innerHTML='';listings.forEach(i=>t.innerHTML+=`<tr><td class="p-4">${i.type}</td><td class="p-4 font-bold">${i.title}</td><td class="p-4">${i.category}</td><td class="p-4 flex gap-2"><button onclick="editItem('listing',${i.id})" class="text-blue-500 hover:bg-blue-50 p-2 rounded"><i class="fa-solid fa-pen"></i></button><button onclick="deleteItem('listing',${i.id})" class="text-red-500 hover:bg-red-50 p-2 rounded"><i class="fa-solid fa-trash"></i></button></td></tr>`)}}
function renderAdminBlogs(){const t=document.getElementById('adminBlogTableBody');if(t){t.innerHTML='';blogs.forEach(i=>t.innerHTML+=`<tr><td class="p-4 font-bold">${i.title}</td><td class="p-4">${i.author}</td><td class="p-4 flex gap-2"><button onclick="editItem('blog',${i.id})" class="text-blue-500 hover:bg-blue-50 p-2 rounded"><i class="fa-solid fa-pen"></i></button><button onclick="deleteItem('blog',${i.id})" class="text-red-500 hover:bg-red-50 p-2 rounded"><i class="fa-solid fa-trash"></i></button></td></tr>`)}}

function renderAdminApplications(){const t=document.getElementById('adminAppsTableBody');if(t){t.innerHTML='';applications.forEach(i=>t.innerHTML+=`<tr><td class="p-4 font-bold">${i.full_name}</td><td class="p-4">${i.email}</td><td class="p-4 truncate max-w-xs">${i.statement}</td><td class="p-4"><button onclick="deleteItem('application',${i.id})" class="text-red-500"><i class="fa-solid fa-trash"></i></button></td></tr>`)}}
function openApplyModal(){document.getElementById('applyFormContainer').classList.remove('hidden');document.getElementById('applySuccessContainer').classList.add('hidden');document.getElementById('applyModal').classList.remove('hidden');}
function openAddModal(){
    populateBlogSelect(); 
    document.getElementById('modalTitleListing').innerText = "Add Listing"; // Reset Title
    document.querySelector('#addModal form').reset();
    document.querySelector('#addModal form').id.value = ""; // Clear ID
    document.getElementById('addModal').classList.remove('hidden');
}
function openAddBlogModal(){
    document.getElementById('modalTitleBlog').innerText = "Write Blog Post"; // Reset Title
    document.querySelector('#addBlogModal form').reset();
    document.querySelector('#addBlogModal form').id.value = ""; // Clear ID
    if(quillEditor) quillEditor.setContents([]);
    document.getElementById('addBlogModal').classList.remove('hidden');
}
function closeModal(id){document.getElementById(id).classList.add('hidden');}
function getMockListings(){return[{id:1,type:"Scholarship",title:"Global Masters",university:"UK",category:"Masters",amount:"Funded",deadline:"2023-12-15"}];}
function getMockBlogs(){return[{id:101,title:"Interview Tips",author:"Dr. HR",date:"Dec 01, 2025",image:"https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1470&auto=format&fit=crop",excerpt:"Tips for interviews...",content:"<h1>Full Interview Guide</h1><p>Here are the tips...</p><ul><li>Be confident</li><li>Dress well</li></ul>"}];}
function getMockApplications(){return[];}