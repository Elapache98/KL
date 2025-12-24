// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// State
let pdfFiles = [];

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const pdfList = document.getElementById('pdfList');
const actions = document.getElementById('actions');
const filenameInput = document.getElementById('filename');
const combineBtn = document.getElementById('combineBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Event Listeners
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', handleDragOver);
uploadZone.addEventListener('dragleave', handleDragLeave);
uploadZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
combineBtn.addEventListener('click', combinePDFs);
clearBtn.addEventListener('click', clearAll);

function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
        addFiles(files);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        addFiles(files);
    }
    fileInput.value = '';
}

async function addFiles(files) {
    for (const file of files) {
        const pdfData = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
            pages: null,
            preview: null
        };
        
        pdfFiles.push(pdfData);
        
        // Generate preview
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            pdfData.pages = pdf.numPages;
            
            // Render first page as preview
            const page = await pdf.getPage(1);
            const scale = 0.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            pdfData.preview = canvas.toDataURL();
        } catch (err) {
            console.error('Error generating preview:', err);
        }
    }
    
    renderPDFList();
    updateActionsVisibility();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderPDFList() {
    pdfList.innerHTML = pdfFiles.map((pdf, index) => `
        <div class="pdf-item" data-id="${pdf.id}" draggable="true">
            <div class="drag-handle">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="pdf-order">#${index + 1}</span>
            <div class="pdf-preview">
                ${pdf.preview 
                    ? `<img src="${pdf.preview}" alt="Preview" style="max-width:100%;max-height:100%;">` 
                    : `<div class="pdf-preview-placeholder">Loading...</div>`
                }
            </div>
            <div class="pdf-info">
                <div class="pdf-name" title="${pdf.name}">${pdf.name}</div>
                <div class="pdf-meta">
                    <span>${pdf.size}</span>
                    ${pdf.pages ? `<span>${pdf.pages} page${pdf.pages > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
            <button class="pdf-remove" onclick="removePDF('${pdf.id}')" title="Remove">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
    
    // Add drag and drop listeners to items
    const items = pdfList.querySelectorAll('.pdf-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleItemDragStart);
        item.addEventListener('dragend', handleItemDragEnd);
        item.addEventListener('dragover', handleItemDragOver);
        item.addEventListener('drop', handleItemDrop);
        item.addEventListener('dragleave', handleItemDragLeave);
    });
}

let draggedItem = null;

function handleItemDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleItemDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.pdf-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
}

function handleItemDragOver(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleItemDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleItemDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    if (draggedItem && this !== draggedItem) {
        const fromId = draggedItem.dataset.id;
        const toId = this.dataset.id;
        
        const fromIndex = pdfFiles.findIndex(p => p.id == fromId);
        const toIndex = pdfFiles.findIndex(p => p.id == toId);
        
        // Reorder array
        const [movedItem] = pdfFiles.splice(fromIndex, 1);
        pdfFiles.splice(toIndex, 0, movedItem);
        
        renderPDFList();
    }
}

function removePDF(id) {
    pdfFiles = pdfFiles.filter(p => p.id != id);
    renderPDFList();
    updateActionsVisibility();
}

function clearAll() {
    pdfFiles = [];
    renderPDFList();
    updateActionsVisibility();
}

function updateActionsVisibility() {
    actions.style.display = pdfFiles.length > 0 ? 'block' : 'none';
}

async function combinePDFs() {
    if (pdfFiles.length === 0) return;
    
    loadingOverlay.classList.add('active');
    
    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();
        
        for (const pdfData of pdfFiles) {
            const arrayBuffer = await pdfData.file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        
        // Create download
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let filename = filenameInput.value.trim() || 'combined-document';
        // Remove .pdf extension if user added it
        filename = filename.replace(/\.pdf$/i, '');
        a.download = filename + '.pdf';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error('Error combining PDFs:', err);
        alert('Error combining PDFs. Please try again.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Make removePDF available globally
window.removePDF = removePDF;

