export const Toast = (() => {
  const container = document.getElementById("toast-container");

  const config = {
    neutral: {
      bg: "bg-gray-800",
      icon: "fa-solid fa-bell",
    },
    success: {
      bg: "bg-green-500",
      icon: "fa-solid fa-circle-check",
    },
    danger: {
      bg: "bg-red-500",
      icon: "fa-solid fa-circle-xmark",
    },
    warning: {
      bg: "bg-yellow-500 text-black",
      icon: "fa-solid fa-triangle-exclamation",
    },
    info: {
      bg: "bg-blue-500",
      icon: "fa-solid fa-circle-info",
    },
  };

  function show(message, type = "neutral", duration = 3000) {
    const { bg, icon } = config[type] || config.neutral;

    const toast = document.createElement("div");
    toast.className = `
      flex items-center gap-3 ${bg}
      text-white px-4 py-2 rounded-xl shadow-lg
      transform transition-all duration-300
      opacity-0 translate-y-[-10px]
    `;

    toast.innerHTML = `
      <i class="${icon} text-lg"></i>
      <span class="text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove("opacity-0", "translate-y-[-10px]");
    });

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-[-10px]");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();

export const Modal = (() => {
  const root = document.getElementById("modal-root");

  const config = {
    neutral: {
      bg: "bg-gray-800",
      icon: "fa-solid fa-bell",
      color: "text-gray-600",
    },
    success: {
      bg: "bg-green-600",
      icon: "fa-solid fa-circle-check",
      color: "text-green-500",
    },
    danger: {
      bg: "bg-red-500",
      icon: "fa-solid fa-circle-xmark",
      color: "text-red-500",
    },
    warning: {
      bg: "bg-yellow-500 text-black",
      icon: "fa-solid fa-triangle-exclamation",
      color: "text-yellow-500",
    },
    info: {
      bg: "bg-blue-500",
      icon: "fa-solid fa-circle-info",
      color: "text-blue-500",
    },
  };

  function open({
    title = "Confirm",
    message = "",
    type = "neutral",
    onConfirm = null,
    confirmText = "Confirm",
    cancelText = "Cancel",
  }) {
    const { icon, color, bg } = config[type] || config.neutral;

    root.innerHTML = `
      <div id="modal-overlay"
           class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6
                    transform scale-95 opacity-0 transition-all duration-300">

          <div class="flex items-center gap-3 mb-4">
            <i class="${icon} ${color} text-2xl"></i>
            <h2 class="text-lg font-semibold">${title}</h2>
          </div>

          <p class="text-gray-600 mb-6">${message}</p>

          <div class="flex justify-end gap-3">
            <button id="modal-cancel"
                    class="px-4 py-2 bg-gray-200 rounded-lg">
              ${cancelText}
            </button>

            <button id="modal-confirm"
                    class="px-4 py-2 ${bg} text-white rounded-lg">
              ${confirmText}
            </button>
          </div>

        </div>
      </div>
    `;

    const overlay = document.getElementById("modal-overlay");
    const box = overlay.querySelector("div");

    // animate in
    requestAnimationFrame(() => {
      box.classList.remove("scale-95", "opacity-0");
    });

    function close() {
      box.classList.add("scale-95", "opacity-0");
      setTimeout(() => (root.innerHTML = ""), 200);
    }

    // events
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    document.getElementById("modal-cancel").onclick = close;

    document.getElementById("modal-confirm").onclick = () => {
      if (onConfirm) onConfirm();
      close();
    };
  }

  return { open };
})();
