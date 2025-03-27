// Donation Modal Functionality
document.addEventListener('DOMContentLoaded', () => {
    const donateButton = document.getElementById('donateButton');
    const donationModal = document.getElementById('donationModal');
    const closeModal = document.querySelector('.close-modal');
    const copyButton = document.getElementById('copyPixKey');
    const pixKey = document.getElementById('pixKey');
    const copiedMessage = document.getElementById('copiedMessage');
    
    // Open modal when donate button is clicked
    donateButton.addEventListener('click', () => {
        donationModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    });
    
    // Close modal when X is clicked
    closeModal.addEventListener('click', () => {
        donationModal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    });
    
    // Close modal when clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target === donationModal) {
            donationModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Copy PIX key to clipboard
    copyButton.addEventListener('click', () => {
        pixKey.select();
        document.execCommand('copy');
        
        // Show copied message
        copiedMessage.style.display = 'block';
        
        // Hide message after 2 seconds
        setTimeout(() => {
            copiedMessage.style.display = 'none';
        }, 2000);
    });
});