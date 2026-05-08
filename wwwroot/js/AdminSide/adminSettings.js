import { AdminStore } from './adminStore.js';
import { Modal } from '../ui.js';

/**
 * Samson Dental Center - Clinic Settings Module
 */

export class ClinicSettings {
    constructor() {
        this.selectors = {
            tabBtns: '.tab-btn',
            tabContents: '.tab-content',
            hoursJson: '#hours-json',
            hoursList: '#hours-list',
            faqsJson: '#faqs-json',
            faqsList: '#faqs-list',
            photosJson: '#photos-json',
            photosList: '#photos-list',
            autoToggle: '#auto-toggle',
            manualBox: '#manual-status-box'
        };

        this.defaultHours = [
            { day: 'Monday', open: '08:00', noonStart: '12:00', noonEnd: '13:00', close: '17:00', closed: false },
            { day: 'Tuesday', open: '08:00', noonStart: '12:00', noonEnd: '13:00', close: '17:00', closed: false },
            { day: 'Wednesday', open: '08:00', noonStart: '12:00', noonEnd: '13:00', close: '17:00', closed: false },
            { day: 'Thursday', open: '08:00', noonStart: '12:00', noonEnd: '13:00', close: '17:00', closed: false },
            { day: 'Friday', open: '08:00', noonStart: '12:00', noonEnd: '13:00', close: '17:00', closed: false },
            { day: 'Saturday', open: '08:00', noonStart: '12:00', noonEnd: '13:00', close: '12:00', closed: false },
            { day: 'Sunday', open: '00:00', noonStart: '00:00', noonEnd: '00:00', close: '00:00', closed: true }
        ];
    }

    init() {
        this.initStatusToggle();
        
        // Eager hydration from Razor-rendered hidden inputs
        this.initHours();
        this.initFaqs();
        this.initPhotos();
        
        this.initialState = this.getFormState();
        
        (async () => {
            const data = await AdminStore.loadData('settings', '/api/admin/data/settings');
            if (data) {
                console.log("[ClinicSettings] Hydrating with data:", data);
                this.initializeWithData({ settings: data });
                this.initialState = this.getFormState(); // update after hydration
            }
        })();

        // Handle navigation guard
        window.onbeforeunload = () => {
            if (this.isDirty()) return "You have unsaved changes.";
        };

        window.addFaq = () => this.addFaq();
        window.removeFaq = (i) => this.removeFaq(i);
        window.updateFaq = (i, k, v) => this.updateFaq(i, k, v);
        window.updateHour = (i, k, v) => this.updateHour(i, k, v);
        window.uploadPhoto = (el) => this.uploadPhoto(el);
        window.uploadLogo = (el) => this.uploadLogo(el);
        window.removePhoto = (i) => this.removePhoto(i);
        window.saveGallery = (btn) => this.saveSection('Photos', btn);

        const toastMsg = document.getElementById('toast-msg')?.value;
        const toastType = document.getElementById('toast-type')?.value;
        if (toastMsg && window.Toast) {
            window.Toast.show(toastMsg, toastType);
            if (toastType === 'success') {
                AdminStore.invalidate('settings');
                this.initialState = this.getFormState(); // reset dirty state
            }
        }
    }

    initializeWithData(data) {
        if (!data.settings) return;
        
        // We still rely on the Razor-rendered hidden inputs for the FORM values
        // but we hydrate the UI LISTS (Hours, FAQs, Photos) from the store.
        
        // Update hidden inputs if needed (optional, since Razor already does this on GET,
        // but good for consistency if we ever go full SPA).
        const hoursInput = document.querySelector(this.selectors.hoursJson);
        const faqsInput = document.querySelector(this.selectors.faqsJson);
        const photosInput = document.querySelector(this.selectors.photosJson);

        if (hoursInput) {
            const hData = data.settings.clinicalHours || data.settings.clinicalHoursJson || '[]';
            hoursInput.value = typeof hData === 'string' ? hData : JSON.stringify(hData);
        }
        if (faqsInput) {
            const fData = data.settings.faqs || data.settings.faqsJson || '[]';
            faqsInput.value = typeof fData === 'string' ? fData : JSON.stringify(fData);
        }
        if (photosInput) {
            const pData = data.settings.clinicPhotos || data.settings.clinicPhotosJson || '[]';
            photosInput.value = typeof pData === 'string' ? pData : JSON.stringify(pData);
        }

        this.initHours();
        this.initFaqs();
        this.initPhotos();
    }

    getFormState() {
        const formData = new FormData(document.querySelector('form'));
        const obj = {};
        formData.forEach((value, key) => { obj[key] = value; });
        return JSON.stringify(obj);
    }

    isDirty() {
        return this.initialState && this.getFormState() !== this.initialState;
    }

    async saveSection(section, btn) {
        if (btn) {
            btn.disabled = true;
            const originalContent = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Saving...`;
            btn.dataset.original = originalContent;
        }

        try {
            const form = document.querySelector('form');
            const formData = new FormData(form);
            
            const resp = await fetch(form.action || window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
                }
            });

            const res = await resp.json();
            if (res.ok) {
                AdminStore.invalidate('settings');
                this.initialState = this.getFormState(); // Reset dirty state
                
                Modal.open({
                    title: "Changes Saved",
                    message: res.message || "Your gallery has been updated and is now live on the homepage.",
                    type: "success",
                    confirmText: "Great"
                });
                
                if (window.Toast) window.Toast.show(res.message, 'success');
            } else {
                Modal.open({
                    title: "Save Failed",
                    message: res.error || "An error occurred while saving your changes.",
                    type: "danger"
                });
            }
        } catch (e) {
            console.error("Save error:", e);
            window.Toast?.show("Network error during save", "danger");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.original;
            }
        }
    }

    // --- Hours Logic ---
    initHours() {
        const input = document.querySelector(this.selectors.hoursJson);
        if (!input) return;

        let data = [];
        try { 
            data = JSON.parse(input.value || '[]'); 
            if (!Array.isArray(data) || data.length === 0) data = this.defaultHours;
        } catch { data = this.defaultHours; }
        
        this.renderHours(data);
    }

    renderHours(hours) {
        const container = document.querySelector(this.selectors.hoursList);
        if (!container) return;

        container.innerHTML = hours.map((h, i) => `
            <div class="p-4 rounded-3xl border border-slate-100 transition-all ${h.closed ? 'bg-slate-50 opacity-40 grayscale pointer-events-none' : 'bg-white shadow-sm'}">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[11px] font-bold text-brand uppercase tracking-widest">${h.day}</span>
                    <div class="flex items-center gap-2 pointer-events-auto">
                        <span class="text-[9px] font-bold ${h.closed ? 'text-red-500' : 'text-slate-400'} uppercase">${h.closed ? 'Closed' : 'Open'}</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" ${h.closed ? 'checked' : ''} onchange="updateHour(${i}, 'closed', this.checked)" class="sr-only peer">
                            <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                        </label>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-1.5 mb-1">
                            <i class="fa-solid fa-sun text-[9px] text-orange-400"></i>
                            <label class="text-[8px] font-bold text-slate-400 uppercase">Morning</label>
                        </div>
                        <input type="time" value="${h.open || '08:00'}" onchange="updateHour(${i}, 'open', this.value)" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand">
                    </div>
                    <div class="space-y-1">
                        <div class="flex items-center gap-1.5 mb-1">
                            <i class="fa-solid fa-mug-hot text-[9px] text-slate-400"></i>
                            <label class="text-[8px] font-bold text-slate-400 uppercase">Noon Break</label>
                        </div>
                        <div class="flex items-center gap-1">
                            <input type="time" value="${h.noonStart || '12:00'}" onchange="updateHour(${i}, 'noonStart', this.value)" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <div class="flex items-center gap-1.5 mb-1 invisible">
                            <label class="text-[8px] font-bold text-slate-400 uppercase">To</label>
                        </div>
                        <div class="flex items-center gap-1">
                            <input type="time" value="${h.noonEnd || '13:00'}" onchange="updateHour(${i}, 'noonEnd', this.value)" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <div class="flex items-center gap-1.5 mb-1">
                            <i class="fa-solid fa-moon text-[9px] text-blue-400"></i>
                            <label class="text-[8px] font-bold text-slate-400 uppercase">Evening</label>
                        </div>
                        <input type="time" value="${h.close || '17:00'}" onchange="updateHour(${i}, 'close', this.value)" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand">
                    </div>
                </div>
            </div>`).join('');
        document.querySelector(this.selectors.hoursJson).value = JSON.stringify(hours);
    }

    updateHour(index, key, value) {
        const input = document.querySelector(this.selectors.hoursJson);
        const hours = JSON.parse(input.value);
        hours[index][key] = value;
        this.renderHours(hours);
    }

    // --- FAQ Logic ---
    initFaqs() {
        const input = document.querySelector(this.selectors.faqsJson);
        if (!input) return;

        let data = [];
        try { 
            const val = input.value || '[]';
            data = JSON.parse(val); 
            if(!Array.isArray(data)) data = []; 
        } catch { data = []; }
        this.renderFaqs(data);
    }

    renderFaqs(faqs) {
        const container = document.querySelector(this.selectors.faqsList);
        if (!container) return;

        if (faqs.length === 0) {
            container.innerHTML = `<div class="col-span-full py-12 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                <i class="fa-solid fa-circle-question text-slate-200 text-4xl mb-3"></i>
                <p class="text-slate-400 text-[13px] font-bold">No FAQs added yet.</p>
                <button type="button" onclick="addFaq()" class="mt-4 text-brand text-xs font-bold uppercase tracking-widest hover:underline">Start adding</button>
            </div>`;
        } else {
            container.innerHTML = faqs.map((f, i) => `
                <div class="bg-white p-5 rounded-[24px] border border-slate-100 relative group animate-fade-in hover:border-brand/20 transition-all shadow-sm">
                    <button type="button" onclick="removeFaq(${i})" class="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-100 shadow-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                        <i class="fa-solid fa-trash-can text-[11px]"></i>
                    </button>
                    <div class="space-y-2">
                        <input type="text" value="${f.question}" onchange="updateFaq(${i}, 'question', this.value)" class="w-full bg-slate-50 px-4 py-2 rounded-xl border-none text-[12px] font-bold text-brand outline-none focus:ring-1 focus:ring-brand" placeholder="The Question...">
                        <textarea onchange="updateFaq(${i}, 'answer', this.value)" class="w-full bg-white px-4 py-2 rounded-xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed outline-none resize-none focus:border-brand" rows="3" placeholder="The Answer...">${f.answer}</textarea>
                    </div>
                </div>`).join('');
        }
        document.querySelector(this.selectors.faqsJson).value = JSON.stringify(faqs);
    }

    addFaq() {
        const input = document.querySelector(this.selectors.faqsJson);
        const faqs = JSON.parse(input.value || '[]');
        faqs.unshift({ question: '', answer: '' });
        this.renderFaqs(faqs);
    }

    removeFaq(index) {
        Modal.open({
            title: "Delete FAQ?",
            message: "Are you sure you want to remove this FAQ? This change will be staged until you save.",
            type: "danger",
            confirmText: "Yes, Remove",
            onConfirm: () => {
                const input = document.querySelector(this.selectors.faqsJson);
                const faqs = JSON.parse(input.value);
                faqs.splice(index, 1);
                this.renderFaqs(faqs);
            }
        });
    }

    updateFaq(index, key, value) {
        const input = document.querySelector(this.selectors.faqsJson);
        const faqs = JSON.parse(input.value);
        faqs[index][key] = value;
        input.value = JSON.stringify(faqs);
    }

    // --- Photos Logic ---
    initPhotos() {
        const input = document.querySelector(this.selectors.photosJson);
        if (!input) return;

        let data = [];
        try { data = JSON.parse(input.value || '[]'); if(!Array.isArray(data)) data = []; } catch { data = []; }
        this.renderPhotos(data);
    }

    renderPhotos(photos) {
        const container = document.querySelector(this.selectors.photosList);
        if (!container) return;

        container.innerHTML = `
            <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                ${photos.map((url, i) => `
                    <div class="aspect-square rounded-lg overflow-hidden border border-slate-100 relative group animate-fade-in shadow-sm">
                        <img src="${url}" class="w-full h-full object-cover">
                        <button type="button" onclick="removePhoto(${i})" class="absolute top-0.5 right-0.5 w-5 h-5 bg-white/90 backdrop-blur rounded-full text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <i class="fa-solid fa-xmark text-[9px]"></i>
                        </button>
                    </div>
                `).join('')}
                <label class="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-slate-50 transition-all group">
                    <input type="file" class="hidden" onchange="uploadPhoto(this)" accept="image/*" multiple>
                    <i class="fa-solid fa-plus text-slate-300 group-hover:text-brand text-[10px]"></i>
                </label>
            </div>
        `;
        document.querySelector(this.selectors.photosJson).value = JSON.stringify(photos);
    }

    async uploadLogo(el) {
        const file = el.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const preview = document.getElementById('logo-preview');
        const originalSrc = preview.src;
        preview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%236366f1' d='M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z'%3E%3CanimateTransform attributeName='transform' type='rotate' from='0 12 12' to='360 12 12' dur='1s' repeatCount='indefinite'/%3E%3C/svg%3E";
        
        try {
            const resp = await fetch('?handler=UploadPhoto', {
                method: 'POST',
                body: formData,
                headers: { 'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value }
            });
            const res = await resp.json();
            if (res.ok) {
                preview.src = res.url;
                document.getElementById('logo-url').value = res.url;
                window.Toast?.show('Logo updated', 'success');
            } else {
                preview.src = originalSrc;
                window.Toast?.show(res.error || 'Upload failed', 'danger');
            }
        } catch (e) {
            preview.src = originalSrc;
            window.Toast?.show('Upload error', 'danger');
        }
    }

    async uploadPhoto(el) {
        const files = Array.from(el.files);
        if (files.length === 0) return;
        
        // Visual feedback: show a "loading" state on the plus icon
        const label = el.parentElement;
        const icon = label.querySelector('i');
        const originalClass = icon.className;
        icon.className = "fa-solid fa-spinner fa-spin text-brand text-[10px]";

        const formData = new FormData();
        files.forEach(file => formData.append('files', file)); // Matches 'List<IFormFile> files'

        try {
            const resp = await fetch('?handler=UploadPhoto', {
                method: 'POST',
                body: formData,
                headers: { 'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value }
            });
            const res = await resp.json();
            
            if (res.ok) {
                const input = document.querySelector(this.selectors.photosJson);
                const photos = JSON.parse(input.value || '[]');
                
                // res.urls is the array from the server
                if (res.urls && Array.isArray(res.urls)) {
                    res.urls.forEach(url => photos.push(url));
                    this.renderPhotos(photos);
                    window.Toast?.show(`${res.urls.length} photo(s) staged for saving`, 'success');
                }
            } else {
                window.Toast?.show(res.error || 'Upload failed', 'danger');
            }
        } catch (e) {
            window.Toast?.show('An unexpected error occurred during upload', 'danger');
        } finally {
            icon.className = originalClass;
            el.value = ""; // Reset input
        }
    }

    removePhoto(index) {
        Modal.open({
            title: "Remove Photo?",
            message: "Are you sure you want to remove this photo? This change will be staged until you save.",
            type: "danger",
            confirmText: "Yes, Remove",
            onConfirm: () => {
                const input = document.querySelector(this.selectors.photosJson);
                const photos = JSON.parse(input.value);
                photos.splice(index, 1);
                this.renderPhotos(photos);
            }
        });
    }

    initStatusToggle() {
        const toggle = document.querySelector(this.selectors.autoToggle);
        const manualBox = document.querySelector(this.selectors.manualBox);
        
        if (!toggle || !manualBox) return;

        const updateVisibility = () => {
            if (toggle.checked) {
                manualBox.classList.add('opacity-40', 'pointer-events-none', 'grayscale');
            } else {
                manualBox.classList.remove('opacity-40', 'pointer-events-none', 'grayscale');
            }
        };

        toggle.addEventListener('change', updateVisibility);
        updateVisibility();
    }
}
