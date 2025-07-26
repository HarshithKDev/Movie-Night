document.addEventListener('DOMContentLoaded', () => {
    const iconContainer = document.getElementById('icon-background');
    if (!iconContainer) return;

    // Enhanced movie-related emojis with better variety
    const icons = [
        '🎬', '🍿', '🎥', '🎞️', '🎟️', '🎭', '⭐', '📽️',
        '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎵', '🎶',
        '🌟', '✨', '💫', '🔥', '💎', '🏆', '🎊', '🎉'
    ];
    
    const numberOfIcons = 60; // Increased for more cinematic effect
    
    // Create initial batch of icons
    for (let i = 0; i < numberOfIcons; i++) {
        createFloatingIcon();
    }
    
    // Continuously spawn new icons
    setInterval(() => {
        createFloatingIcon();
        // Clean up old icons to prevent memory leaks
        cleanupIcons();
    }, 1000);
    
    function createFloatingIcon() {
        const icon = document.createElement('span');
        icon.classList.add('moving-icon');
        
        // Choose a random icon from the array
        icon.innerText = icons[Math.floor(Math.random() * icons.length)];
        
        // Enhanced randomization for more natural movement
        const size = Math.random() * 3 + 1.5; // Size between 1.5rem and 4.5rem
        const left = Math.random() * 100; // Horizontal position
        const animationDuration = Math.random() * 15 + 20; // Duration between 20s and 35s
        const animationDelay = Math.random() * -10; // Staggered start times
        const opacity = Math.random() * 0.15 + 0.05; // Subtle opacity variation
        
        // Apply styles
        icon.style.fontSize = `${size}rem`;
        icon.style.left = `${left}vw`;
        icon.style.animationDuration = `${animationDuration}s`;
        icon.style.animationDelay = `${animationDelay}s`;
        icon.style.opacity = opacity;
        
        // Start icons from below the viewport
        icon.style.bottom = `-${size}rem`;
        
        // Add slight horizontal drift
        const drift = Math.random() * 40 - 20; // -20 to +20
        icon.style.setProperty('--drift', `${drift}px`);
        
        // Add random rotation speed
        const rotationSpeed = Math.random() * 2 + 0.5; // 0.5 to 2.5
        icon.style.setProperty('--rotation-speed', `${rotationSpeed}`);
        
        iconContainer.appendChild(icon);
        
        // Mark creation time for cleanup
        icon.dataset.created = Date.now();
    }
    
    function cleanupIcons() {
        const icons = iconContainer.querySelectorAll('.moving-icon');
        const now = Date.now();
        
        icons.forEach(icon => {
            const created = parseInt(icon.dataset.created);
            // Remove icons older than 40 seconds
            if (now - created > 40000) {
                icon.remove();
            }
        });
    }
    
    // Add interactive hover effects to the background
    iconContainer.addEventListener('mousemove', (e) => {
        const icons = iconContainer.querySelectorAll('.moving-icon');
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        icons.forEach(icon => {
            const rect = icon.getBoundingClientRect();
            const iconX = rect.left + rect.width / 2;
            const iconY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(mouseX - iconX, 2) + Math.pow(mouseY - iconY, 2)
            );
            
            // Create subtle attraction effect within 200px radius
            if (distance < 200) {
                const force = (200 - distance) / 200;
                const angle = Math.atan2(mouseY - iconY, mouseX - iconX);
                const attraction = force * 10;
                
                icon.style.transform = `
                    translate(${Math.cos(angle) * attraction}px, ${Math.sin(angle) * attraction}px)
                    rotate(${force * 180}deg)
                `;
                icon.style.opacity = Math.min(0.3, parseFloat(icon.style.opacity) + force * 0.1);
            } else {
                icon.style.transform = '';
                icon.style.opacity = icon.style.opacity || 0.1;
            }
        });
    });
    
    // Reset icons when mouse leaves
    iconContainer.addEventListener('mouseleave', () => {
        const icons = iconContainer.querySelectorAll('.moving-icon');
        icons.forEach(icon => {
            icon.style.transform = '';
            icon.style.opacity = icon.style.opacity || 0.1;
        });
    });
    
    // Add cinema-style flicker effect occasionally
    setInterval(() => {
        if (Math.random() < 0.1) { // 10% chance every 3 seconds
            document.body.style.filter = 'brightness(1.2) contrast(1.1)';
            setTimeout(() => {
                document.body.style.filter = 'brightness(0.9) contrast(0.9)';
                setTimeout(() => {
                    document.body.style.filter = '';
                }, 100);
            }, 150);
        }
    }, 3000);
    
    // Add subtle pulsing effect to glass morphism elements
    const glassElements = document.querySelectorAll('.glass-morphism');
    glassElements.forEach(element => {
        setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance
                element.style.boxShadow = '0 0 80px rgba(99, 102, 241, 0.4)';
                setTimeout(() => {
                    element.style.boxShadow = '0 0 50px rgba(99, 102, 241, 0.3)';
                }, 1000);
            }
        }, 2000);
    });
});