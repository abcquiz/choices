// toast.js
class ToastAlert {
    constructor() {
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(this.container);
    }

    show(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-header">
                ${icon}
                <strong>${title}</strong>
                <button class="toast-close">×</button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        this.container.appendChild(toast);

        // Ajouter la classe pour l'animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);

        // Bouton de fermeture
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.close(toast));

        // Auto-fermeture après 5 secondes
        setTimeout(() => this.close(toast), 5000);
    }

    close(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }

    getIcon(type) {
        const icons = {
            success: '<svg class="toast-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8m4.6-12.1L11 13.5l-2.6-2.6-1.4 1.4 4 4 7-7-1.4-1.4z"/></svg>',
            error: '<svg class="toast-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8m-1-13h2v6h-2v-6m0 8h2v2h-2v-2z"/></svg>',
            info: '<svg class="toast-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8m-1-13h2v2h-2V7m0 4h2v6h-2v-6z"/></svg>'
        };
        return icons[type] || icons.info;
    }
}

// Créer une instance globale
window.toast = new ToastAlert();