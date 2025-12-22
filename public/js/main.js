document.addEventListener('DOMContentLoaded', () => {
    const loginModalOverlay = document.getElementById('login-modal-overlay');
    const loginBtn = document.getElementById('login-btn');
    const heroCtaBtn = document.getElementById('hero-cta-btn');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const closeModalBtn = document.querySelector('.close-btn');
    const userNavProfile = document.querySelector('.user-nav-profile');
    const userDropdownMenu = document.querySelector('.user-dropdown-menu');

    const showLoginModal = () => {
        if (loginModalOverlay) {
            loginModalOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };
    window.showLoginModal = showLoginModal;

    const hideLoginModal = () => {
        if (loginModalOverlay) {
            loginModalOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    loginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginModal();
    });

    heroCtaBtn?.addEventListener('click', (e) => {
        const isLoggedIn = !document.getElementById('login-btn');
        if (!isLoggedIn) {
            e.preventDefault();
            showLoginModal();
        }
    });

    mobileMenuToggle?.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenuToggle.querySelector('i');
        if (icon.classList.contains('fa-bars')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });

    closeModalBtn?.addEventListener('click', hideLoginModal);

    loginModalOverlay?.addEventListener('click', (e) => {
        if (e.target === loginModalOverlay) hideLoginModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && loginModalOverlay && !loginModalOverlay.classList.contains('hidden')) {
            hideLoginModal();
        }
    });

    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.feature-card, .testimonial-card, .stat-item');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    };
    animateOnScroll();

    const setupPasswordToggle = (toggleId, inputId) => {
        const toggleBtn = document.getElementById(toggleId);
        const passwordInput = document.getElementById(inputId);

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function (e) {
                e.preventDefault(); 
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        }
    };

    setupPasswordToggle('toggleSignupPassword', 'password');
    setupPasswordToggle('toggleLoginPassword', 'modal-password');

    // --- ADDED: CLICK-BASED USER DROPDOWN LOGIC ---
    if (userNavProfile && userDropdownMenu) {
        userNavProfile.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents click from reaching the window
            userDropdownMenu.classList.toggle('show');
        });

        // Close the menu if user clicks anywhere else
        window.addEventListener('click', () => {
            if (userDropdownMenu.classList.contains('show')) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }
});