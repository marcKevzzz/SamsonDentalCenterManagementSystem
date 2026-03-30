import { toggleFaq } from "../site.js";

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
});

function initEvents() {
  // FAQ Toggle
  document.querySelectorAll(".faq-toggle").forEach((btn, i) => {
    btn.addEventListener("click", () => toggleFaq(i));
  });
}
