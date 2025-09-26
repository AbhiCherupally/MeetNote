// Options page redirect script
const settingsUrl = 'https://meetnoteapp.netlify.app/settings';
let countdown = 5;

const timerElement = document.getElementById('timer');
const countdownElement = document.getElementById('countdown');
const redirectBtn = document.getElementById('redirectBtn');

// Update countdown
const updateTimer = () => {
    timerElement.textContent = countdown;
    
    if (countdown <= 0) {
        window.location.href = settingsUrl;
        return;
    }
    
    countdown--;
};

// Start countdown
updateTimer();
const interval = setInterval(updateTimer, 1000);

// Manual redirect
redirectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearInterval(interval);
    window.location.href = settingsUrl;
});

// Stop countdown on hover
redirectBtn.addEventListener('mouseenter', () => {
    clearInterval(interval);
    countdownElement.style.opacity = '0.5';
});