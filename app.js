// Supabase Configuration
const SUPABASE_URL = 'https://kealupntxcboyhhsdwqi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYWx1cG50eGNib3loaHNkd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDYxNTMsImV4cCI6MjA4MzEyMjE1M30.dDYt7VrMhw9xAV_l8gjYgAP2j_uNcOLSOqEgBUKj8N8';

// State
let allContacts = [];
let filteredContacts = [];
let selectedContactId = null;
let currentFilter = 'ALL';
let searchTerm = '';
let selectedTags = new Set();
let showTags = false;
let allTags = []; // Loaded from database

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadTags();
    await loadContacts();
    setupEventListeners();
    renderTagFilters();
    renderContactList();
}

// Supabase API Functions
async function loadTags() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/tags?select=*&active=eq.true&order=display_order.asc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load tags');
        
        allTags = await response.json();
        console.log(`Loaded ${allTags.length} tags`);
    } catch (error) {
        console.error('Error loading tags:', error);
        alert('Failed to load tags. Check console for details.');
    }
}
async function loadContacts() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/phonebase?select=*&order=name.asc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load contacts');
        
        allContacts = await response.json();
        filteredContacts = [...allContacts];
        console.log(`Loaded ${allContacts.length} contacts`);
    } catch (error) {
        console.error('Error loading contacts:', error);
        alert('Failed to load contacts. Check console for details.');
    }
}

async function saveContactToDb(contact) {
    try {
        const method = contact.id ? 'PATCH' : 'POST';
        const url = contact.id 
            ? `${SUPABASE_URL}/rest/v1/phonebase?id=eq.${contact.id}`
            : `${SUPABASE_URL}/rest/v1/phonebase`;
        
        const response = await fetch(url, {
            method,
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(contact)
        });
        
        if (!response.ok) throw new Error('Failed to save contact');
        
        await loadContacts();
        applyFilters();
        renderContactList();
        
        return true;
    } catch (error) {
        console.error('Error saving contact:', error);
        alert('Failed to save contact. Check console for details.');
        return false;
    }
}

async function deleteContactFromDb(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/phonebase?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete contact');
        
        await loadContacts();
        applyFilters();
        renderContactList();
        selectedContactId = null;
        showEmptyState();
        
        return true;
    } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact. Check console for details.');
        return false;
    }
}

// Event Listeners
function setupEventListeners() {
    // Alpha filter
    document.querySelectorAll('.alpha-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.letter;
            applyFilters();
            renderContactList();
        });
    });
    
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        applyFilters();
        renderContactList();
    });
    
    // Header buttons
    document.getElementById('newEntryBtn').addEventListener('click', () => openContactEditor());
    document.getElementById('showTagsBtn').addEventListener('click', toggleTags);
    document.getElementById('editTagsBtn').addEventListener('click', openTagEditor);
}

// Filtering
function applyFilters() {
    filteredContacts = allContacts.filter(contact => {
        // Alpha filter
        if (currentFilter !== 'ALL') {
            const firstLetter = (contact.name || '').charAt(0).toUpperCase();
            if (firstLetter !== currentFilter) return false;
        }
        
        // Search filter
        if (searchTerm) {
            const searchFields = [
                contact.name, contact.first, contact.phone, 
                contact.city, contact.state, contact.notes
            ].map(f => (f || '').toLowerCase());
            
            if (!searchFields.some(field => field.includes(searchTerm))) {
                return false;
            }
        }
        
        // Tag filter
        if (selectedTags.size > 0) {
            const contactTags = getContactTags(contact);
            const hasSelectedTag = Array.from(selectedTags).some(tagIdx => 
                contactTags.includes(tagIdx)
            );
            if (!hasSelectedTag) return false;
        }
        
        return true;
    });
}

// Tag Utilities
function getContactTags(contact) {
    if (!contact.country) return [];
    const tags = [];
    for (let i = 0; i < contact.country.length; i++) {
        if (contact.country[i] === 'X') {
            tags.push(i);
        }
    }
    return tags;
}

function setContactTag(country, tagIndex, value) {
    const arr = (country || 'O'.repeat(50)).split('');
    while (arr.length < 50) arr.push('O');
    arr[tagIndex] = value ? 'X' : 'O';
    return arr.join('');
}

function getTagName(index) {
    const tag = allTags.find(t => t.position === index);
    return tag ? tag.name : `Tag ${index + 1}`;
}

function getActiveTags() {
    return allTags.filter(t => t.active).sort((a, b) => a.display_order - b.display_order);
}

// Rendering
function renderContactList() {
    const listEl = document.getElementById('contactList');
    const countEl = document.getElementById('entryCount');
    
    if (filteredContacts.length === 0) {
        listEl.innerHTML = '<div class="loading">No contacts found</div>';
        countEl.textContent = '0';
        return;
    }
    
    listEl.innerHTML = filteredContacts.map(contact => `
        <div class="contact-item ${contact.id === selectedContactId ? 'selected' : ''}" 
             onclick="selectContact(${contact.id})">
            <div class="contact-item-name">${escapeHtml(contact.name || 'Unnamed')}</div>
            <div class="contact-item-details">
                ${contact.phone || ''} ${contact.city ? '• ' + escapeHtml(contact.city) : ''}
            </div>
        </div>
    `).join('');
    
    countEl.textContent = filteredContacts.length;
}

function renderTagFilters() {
    const container = document.getElementById('tagFilterList');
    const activeTags = getActiveTags();
    
    container.innerHTML = activeTags.map(tag => `
        <div class="tag-filter-item">
            <input type="checkbox" id="tagFilter${tag.position}" 
                   onchange="toggleTagFilter(${tag.position})"
                   ${selectedTags.has(tag.position) ? 'checked' : ''}>
            <label for="tagFilter${tag.position}">${escapeHtml(tag.name)}</label>
        </div>
    `).join('');
}

function selectContact(id) {
    selectedContactId = id;
    renderContactList();
    showContactDetail(id);
}

function showContactDetail(id) {
    const contact = allContacts.find(c => c.id === id);
    if (!contact) return;
    
    const tags = getContactTags(contact);
    const tagBadges = tags.map(idx => 
        `<span class="tag-badge">${escapeHtml(getTagName(idx))}</span>`
    ).join('');
    
    const detailEl = document.getElementById('contactDetail');
    detailEl.innerHTML = `
        <div class="detail-header">
            <h2>${escapeHtml(contact.name || 'Unnamed')}</h2>
            <div class="detail-controls">
                <button class="btn" onclick="openContactEditor(${id})">Edit</button>
            </div>
        </div>
        
        <div class="detail-section">
            ${contact.first ? `<div class="detail-row">
                <div class="detail-label">FIRST</div>
                <div class="detail-value">${escapeHtml(contact.first)}</div>
            </div>` : ''}
            
            ${contact.phone ? `<div class="detail-row">
                <div class="detail-label">PHONE</div>
                <div class="detail-value">${escapeHtml(contact.phone)}</div>
            </div>` : ''}
            
            ${contact.prefix ? `<div class="detail-row">
                <div class="detail-label">PREFIX</div>
                <div class="detail-value">${escapeHtml(contact.prefix)}</div>
            </div>` : ''}
            
            ${contact.address1 ? `<div class="detail-row">
                <div class="detail-label">ADDRESS</div>
                <div class="detail-value">${escapeHtml(contact.address1)}</div>
            </div>` : ''}
            
            ${contact.address2 ? `<div class="detail-row">
                <div class="detail-label">ADDRESS 2</div>
                <div class="detail-value">${escapeHtml(contact.address2)}</div>
            </div>` : ''}
            
            ${contact.city || contact.state || contact.zip ? `<div class="detail-row">
                <div class="detail-label">LOCATION</div>
                <div class="detail-value">
                    ${[contact.city, contact.state, contact.zip].filter(Boolean).map(escapeHtml).join(', ')}
                </div>
            </div>` : ''}
            
            ${contact.email ? `<div class="detail-row">
                <div class="detail-label">EMAIL/FAX</div>
                <div class="detail-value">${escapeHtml(contact.email)}</div>
            </div>` : ''}
        </div>
        
        ${tags.length > 0 ? `
            <div class="detail-tags">
                <strong>Tags:</strong><br>
                ${tagBadges}
            </div>
        ` : ''}
        
        ${contact.notes ? `
            <div class="detail-notes">
                <strong>Notes:</strong><br><br>
                ${escapeHtml(contact.notes)}
            </div>
        ` : ''}
    `;
}

function showEmptyState() {
    document.getElementById('contactDetail').innerHTML = `
        <div class="empty-state">Select a contact to view details</div>
    `;
}

// Tag Toggle
function toggleTags() {
    showTags = !showTags;
    const tagFilters = document.getElementById('tagFilters');
    const btn = document.getElementById('showTagsBtn');
    
    if (showTags) {
        tagFilters.style.display = 'block';
        btn.textContent = 'Hide Tags';
    } else {
        tagFilters.style.display = 'none';
        btn.textContent = 'Show Tags';
    }
}

function toggleTagFilter(tagIndex) {
    if (selectedTags.has(tagIndex)) {
        selectedTags.delete(tagIndex);
    } else {
        selectedTags.add(tagIndex);
    }
    applyFilters();
    renderContactList();
}

// Contact Editor
function openContactEditor(id = null) {
    const modal = document.getElementById('contactEditModal');
    const title = document.getElementById('editModalTitle');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (id) {
        const contact = allContacts.find(c => c.id === id);
        if (!contact) return;
        
        title.textContent = 'Edit Contact';
        deleteBtn.style.display = 'block';
        
        document.getElementById('editContactId').value = contact.id;
        document.getElementById('editName').value = contact.name || '';
        document.getElementById('editFirst').value = contact.first || '';
        document.getElementById('editPhone').value = contact.phone || '';
        document.getElementById('editPrefix').value = contact.prefix || '';
        document.getElementById('editAddress1').value = contact.address1 || '';
        document.getElementById('editAddress2').value = contact.address2 || '';
        document.getElementById('editCity').value = contact.city || '';
        document.getElementById('editState').value = contact.state || '';
        document.getElementById('editZip').value = contact.zip || '';
        document.getElementById('editEmail').value = contact.email || '';
        document.getElementById('editNotes').value = contact.notes || '';
        
        renderEditTags(contact.country);
    } else {
        title.textContent = 'New Entry';
        deleteBtn.style.display = 'none';
        
        document.getElementById('editContactId').value = '';
        document.getElementById('contactForm').reset();
        renderEditTags(null);
    }
    
    modal.classList.add('active');
}

function closeContactEditor() {
    document.getElementById('contactEditModal').classList.remove('active');
}

function renderEditTags(country) {
    const container = document.getElementById('editTagsList');
    const tags = country ? getContactTags({ country }) : [];
    const activeTags = getActiveTags();
    
    container.innerHTML = activeTags.map(tag => `
        <div class="tag-checkbox">
            <input type="checkbox" id="editTag${tag.position}" value="${tag.position}"
                   ${tags.includes(tag.position) ? 'checked' : ''}>
            <label for="editTag${tag.position}">${escapeHtml(tag.name)}</label>
        </div>
    `).join('');
}

async function saveContact() {
    const id = document.getElementById('editContactId').value;
    const name = document.getElementById('editName').value.trim();
    
    if (!name) {
        alert('Name is required');
        return;
    }
    
    // Build country string from tag checkboxes
    let country = 'O'.repeat(50);
    document.querySelectorAll('#editTagsList input[type="checkbox"]:checked').forEach(cb => {
        const tagIdx = parseInt(cb.value);
        country = setContactTag(country, tagIdx, true);
    });
    
    const contact = {
        name,
        first: document.getElementById('editFirst').value.trim() || null,
        phone: document.getElementById('editPhone').value.trim() || null,
        prefix: document.getElementById('editPrefix').value.trim() || null,
        notes: document.getElementById('editNotes').value.trim() || null,
        address1: document.getElementById('editAddress1').value.trim() || null,
        address2: document.getElementById('editAddress2').value.trim() || null,
        city: document.getElementById('editCity').value.trim() || null,
        state: document.getElementById('editState').value.trim() || null,
        zip: document.getElementById('editZip').value.trim() || null,
        country,
        email: document.getElementById('editEmail').value.trim() || null
    };
    
    if (id) {
        contact.id = parseInt(id);
    }
    
    const success = await saveContactToDb(contact);
    if (success) {
        closeContactEditor();
        if (id) {
            selectContact(parseInt(id));
        }
    }
}

async function deleteContact() {
    const id = document.getElementById('editContactId').value;
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }
    
    const success = await deleteContactFromDb(parseInt(id));
    if (success) {
        closeContactEditor();
    }
}

// Tag Editor
function openTagEditor() {
    const modal = document.getElementById('tagEditorModal');
    renderTagEditor();
    modal.classList.add('active');
}

function renderTagEditor() {
    const container = document.getElementById('tagEditorList');

    // Create array of all 50 possible tag positions with their data
    const tagData = [];
    for (let pos = 0; pos < 50; pos++) {
        const tag = allTags.find(t => t.position === pos);
        tagData.push({
            position: pos,
            name: tag ? tag.name : '',
            displayOrder: tag ? tag.display_order : (allTags.length + pos + 1),
            active: tag ? tag.active : false
        });
    }

    // Sort by display order
    tagData.sort((a, b) => a.displayOrder - b.displayOrder);

    // Render sorted tags
    let html = '';
    tagData.forEach((tag, index) => {
        const isFirst = index === 0;
        const isLast = index === tagData.length - 1;

        html += `
            <div class="tag-editor-item" data-index="${index}">
                <div class="position">${tag.position + 1}</div>
                <input type="text" class="tag-name" data-position="${tag.position}"
                       value="${escapeHtml(tag.name)}"
                       placeholder="Tag ${tag.position + 1}">
                <input type="hidden" class="order" data-position="${tag.position}"
                       value="${tag.displayOrder}">
                <input type="checkbox" class="active" data-position="${tag.position}"
                       ${tag.active ? 'checked' : ''}>
                <div class="tag-actions">
                    <button class="btn-arrow" onclick="moveTagUp(${index})" ${isFirst ? 'disabled' : ''}>▲</button>
                    <button class="btn-arrow" onclick="moveTagDown(${index})" ${isLast ? 'disabled' : ''}>▼</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function moveTagUp(index) {
    if (index === 0) return;

    const items = document.querySelectorAll('.tag-editor-item');
    const currentItem = items[index];
    const previousItem = items[index - 1];

    // Swap display order values
    const currentOrder = currentItem.querySelector('.order');
    const previousOrder = previousItem.querySelector('.order');

    const temp = currentOrder.value;
    currentOrder.value = previousOrder.value;
    previousOrder.value = temp;

    // Re-render
    renderTagEditor();
}

function moveTagDown(index) {
    const items = document.querySelectorAll('.tag-editor-item');
    if (index === items.length - 1) return;

    const currentItem = items[index];
    const nextItem = items[index + 1];

    // Swap display order values
    const currentOrder = currentItem.querySelector('.order');
    const nextOrder = nextItem.querySelector('.order');

    const temp = currentOrder.value;
    currentOrder.value = nextOrder.value;
    nextOrder.value = temp;

    // Re-render
    renderTagEditor();
}

function closeTagEditor() {
    document.getElementById('tagEditorModal').classList.remove('active');
}

async function saveTagChanges() {
    const updates = [];
    
    // Collect all tag data from the editor
    for (let pos = 0; pos < 50; pos++) {
        const nameInput = document.querySelector(`.tag-name[data-position="${pos}"]`);
        const orderInput = document.querySelector(`.order[data-position="${pos}"]`);
        const activeInput = document.querySelector(`.active[data-position="${pos}"]`);
        
        const name = nameInput.value.trim();
        const displayOrder = parseInt(orderInput.value) || (pos + 1);
        const active = activeInput.checked;
        
        if (name) {
            updates.push({
                position: pos,
                name: name,
                display_order: displayOrder,
                active: active
            });
        }
    }
    
    try {
        // Delete all existing tags (must use a filter in Supabase)
        await fetch(`${SUPABASE_URL}/rest/v1/tags?position=gte.0`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=representation'
            }
        });
        
        // Insert all tags
        if (updates.length > 0) {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/tags`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) throw new Error('Failed to save tags');
        }
        
        // Reload tags and update UI
        await loadTags();
        renderTagFilters();
        closeTagEditor();
        
        if (selectedContactId) {
            showContactDetail(selectedContactId);
        }
        
        alert('Tags saved successfully!');
    } catch (error) {
        console.error('Error saving tags:', error);
        alert('Failed to save tags. Check console for details.');
    }
}

// Utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
