document.addEventListener('DOMContentLoaded', () => {
    const iconContainer = document.getElementById('icon-background');
    if (!iconContainer) return;

    // A selection of movie-related emojis
    const icons = ['🎬', '🍿', '🎥', '🎞️', '🎟️', '🎭', '⭐', '📽️'];
    const numberOfIcons = 50; // Adjust for more or fewer icons

    for (let i = 0; i < numberOfIcons; i++) {
        const icon = document.createElement('span');
        icon.classList.add('moving-icon');
        
        // Choose a random icon from the array
        icon.innerText = icons[Math.floor(Math.random() * icons.length)];
        
        // Randomize properties for a natural look
        const size = Math.random() * 4 + 2; // Size between 2rem and 6rem
        const left = Math.random() * 100; // Horizontal position
        const animationDuration = Math.random() * 20 + 15; // Duration between 15s and 35s
        const animationDelay = Math.random() * -20; // Negative delay to start animations at different times

        icon.style.fontSize = `${size}rem`;
        icon.style.left = `${left}vw`;
        icon.style.animationDuration = `${animationDuration}s`;
        icon.style.animationDelay = `${animationDelay}s`;
        
        // Start icons from below the viewport
        icon.style.bottom = `-${size}rem`;

        iconContainer.appendChild(icon);
    }
});
