document.addEventListener("DOMContentLoaded", () => {
    initContactsAnimations();
    initFormInteractions();
    
    if (window.activeInquiryId && window.activeInquiryId !== '') {
        fetchChatMessages();
        startChatPolling();
    }
});

function initContactsAnimations() {

    // 1. Entrance animation for header
    gsap.fromTo(".contact-reveal h1, .contact-reveal p", 
        { autoAlpha: 0, y: 30 },
        {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power3.out",
            onComplete: function() {
                this.targets().forEach(el => el.classList.add('revealed'));
                gsap.set(this.targets(), { clearProps: "all" });
            }
        }
    );

    // 2. Entrance for info cards
    gsap.fromTo(".mission-card", 
        { autoAlpha: 0, y: 40, scale: 0.95 },
        {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "back.out(1.7)",
            scrollTrigger: {
                trigger: ".mission-card",
                start: "top 90%",
                once: true
            },
            onComplete: function() {
                this.targets().forEach(el => el.classList.add('revealed'));
                gsap.set(this.targets(), { clearProps: "all" });
            }
        }
    );

    // 3. Hover effects for info cards (desktop)
    if (window.innerWidth > 1024) {
        document.querySelectorAll(".mission-card").forEach(card => {
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
    gsap.fromTo("#contactSection .reveal-up", 
        { autoAlpha: 0, y: 50 },
        {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            stagger: 0.3,
            ease: "power4.out",
            scrollTrigger: {
                trigger: "#contactSection",
                start: "top 80%",
                once: true
            },
            onComplete: function() {
                this.targets().forEach(el => el.classList.add('revealed'));
                gsap.set(this.targets(), { clearProps: "all" });
            }
        }
    );
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
            // Mobile: scroll into view
            if (window.innerWidth < 768) {
                setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
            }
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

    // Chat auto-resize and focus scroll
    const chatReply = document.getElementById("chatReply");
    if (chatReply) {
        chatReply.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        chatReply.addEventListener('focus', () => {
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    chatReply.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 300);
            }
        });

        chatReply.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendFollowup();
            }
        });
    }
}

window.handleSubmit = async function(event) {
    event.preventDefault();
    const btn = document.getElementById("submitBtn");
    const successMsg = document.getElementById("successMsg");
    const contactForm = document.getElementById("contactForm");
    const chatContainer = document.getElementById("chatContainer");

    const patientId = document.getElementById("patientId").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...`;

    try {
        const res = await fetch('/api/inquiry/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: patientId || null,
                subject: subject,
                message: message,
                guestEmail: email,
                guestFirstName: firstName,
                guestLastName: lastName,
                guestPhone: phone
            })
        });

        const data = await res.json();
        if (data.ok) {
            window.activeInquiryId = data.inquiryId;
            
            gsap.to(contactForm, {
                opacity: 0, y: -20, duration: 0.5,
                onComplete: () => {
                    contactForm.classList.add('hidden');
                    successMsg.classList.remove('hidden');
                    chatContainer.classList.remove('hidden');
                    
                    gsap.fromTo([successMsg, chatContainer], 
                        { opacity: 0, y: 20 }, 
                        { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "back.out(1.7)" }
                    );
                    
                    fetchChatMessages();
                    startChatPolling();
                }
            });
        } else {
            alert(data.error || "Failed to send inquiry.");
            btn.disabled = false;
            btn.innerHTML = "Send Message";
        }
    } catch (err) {
        console.error(err);
        alert("Network error. Please try again.");
        btn.disabled = false;
        btn.innerHTML = "Send Message";
    }
};

window.fetchChatMessages = async function() {
    if (!window.activeInquiryId) return;
    try {
        const res = await fetch(`/api/inquiry/messages/${window.activeInquiryId}`);
        const data = await res.json();
        if (data.ok) {
            const container = document.getElementById("chatMessages");
            const wasAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 100;
            
            container.innerHTML = '';
            data.messages.forEach(msg => {
                const isMe = !msg.is_from_staff;
                const div = document.createElement('div');
                div.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;
                div.innerHTML = `
                    <div class="max-w-[85%] md:max-w-[80%] px-4 py-3 rounded-2xl text-[12px] ${isMe ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/10' : 'bg-white border border-slate-100 text-brand rounded-tl-none shadow-sm'}">
                        <p class="leading-relaxed font-medium whitespace-pre-wrap">${msg.message}</p>
                        <div class="text-[9px] mt-1.5 opacity-60 font-bold">${new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
                container.appendChild(div);
            });
            
            if (wasAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    } catch (err) { console.error("Fetch error:", err); }
};

window.sendFollowup = async function() {
    const input = document.getElementById("chatReply");
    const msg = input.value.trim();
    if (!msg || !window.activeInquiryId) return;

    input.disabled = true;
    try {
        const res = await fetch('/api/inquiry/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inquiryId: window.activeInquiryId,
                message: msg,
                isFromStaff: false
            })
        });
        if (res.ok) {
            input.value = '';
            input.style.height = 'auto';
            await fetchChatMessages();
            document.getElementById("chatMessages").scrollTop = document.getElementById("chatMessages").scrollHeight;
        }
    } finally {
        input.disabled = false;
        input.focus();
    }
};

function startChatPolling() {
    setInterval(() => {
        fetchChatMessages();
    }, 5000); // Poll every 5s
}
