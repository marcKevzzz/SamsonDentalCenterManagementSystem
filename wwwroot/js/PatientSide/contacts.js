document.addEventListener("DOMContentLoaded", () => {
    initContactsAnimations();
    initFormInteractions();
});

function initContactsAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // 1. Entrance animation for header
    gsap.from("section:first-of-type h1, section:first-of-type p", {
        opacity: 0,
        y: 30,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out"
    });

    // 2. Entrance for info cards
    gsap.from(".info-card", {
        scrollTrigger: {
            trigger: ".info-card",
            start: "top 90%",
            once: true
        },
        opacity: 0,
        y: 40,
        scale: 0.95,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.7)"
    });

    // 3. Hover effects for info cards (desktop)
    if (window.innerWidth > 1024) {
        document.querySelectorAll(".info-card").forEach(card => {
            card.addEventListener("mouseenter", () => {
                gsap.to(card, {
                    y: -8,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                    duration: 0.4,
                    ease: "power2.out"
                });
                gsap.to(card.querySelector("svg"), {
                    scale: 1.2,
                    rotate: 5,
                    duration: 0.4,
                    ease: "power2.out"
                });
            });
            card.addEventListener("mouseleave", () => {
                gsap.to(card, {
                    y: 0,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    duration: 0.4,
                    ease: "power2.out"
                });
                gsap.to(card.querySelector("svg"), {
                    scale: 1,
                    rotate: 0,
                    duration: 0.4,
                    ease: "power2.out"
                });
            });
        });
    }

    // 4. Form and Map reveal
    gsap.from("#contactSection .fade-up", {
        scrollTrigger: {
            trigger: "#contactSection",
            start: "top 80%",
            once: true
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.3,
        ease: "power4.out"
    });
}

function initFormInteractions() {
    const successMsg = document.getElementById("successMsg");
    if (successMsg) {
        gsap.set(successMsg, { display: "none", opacity: 0, y: 20 });
    }

    const inputs = document.querySelectorAll(".form-input");
    inputs.forEach(input => {
        input.addEventListener("focus", () => {
            gsap.to(input, {
                borderColor: "#1E40AF",
                backgroundColor: "#fff",
                duration: 0.3
            });
        });
        input.addEventListener("blur", () => {
            if (!input.value) {
                gsap.to(input, {
                    borderColor: "#e5e7eb",
                    backgroundColor: "#f9fafb",
                    duration: 0.3
                });
            }
        });
    });
}

window.handleSubmit = function(event) {
    event.preventDefault();
    const btn = event.target.querySelector("button[type='submit']");
    const successMsg = document.getElementById("successMsg");

    // Disable button and show loading state
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...`;

    // Simulate network delay
    setTimeout(() => {
        gsap.to(event.target, {
            opacity: 0,
            y: -20,
            duration: 0.5,
            onComplete: () => {
                event.target.style.display = "none";
                successMsg.style.display = "flex";
                gsap.to(successMsg, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: "back.out(1.7)"
                });
            }
        });
    }, 1500);
};
