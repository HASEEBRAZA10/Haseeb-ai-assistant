document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // CONFIGURATION
  // ==========================================
  // Groq Console (console.groq.com) se mili hui API Key yahan paste karein:
  // Note: Groq API keys hamesha "gsk_..." se start hoti hain.
  const GROQ_API_KEY =
    "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";

  // App State
  let chats = JSON.parse(localStorage.getItem("novaai_chats")) || [];
  let currentChatId = null;

  // Key DOM Elements
  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");
  const messagesContainer = document.getElementById("messages-container");
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatHistoryList = document.getElementById("chat-history-list");

  // Sidebars & Modals
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const settingsModal = document.getElementById("settings-modal");

  // Initialize
  renderHistory();

  // Auto-expand textarea & toggle send button
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 150)}px`;
    btnSend.disabled = chatInput.value.trim() === "";
  });

  // Key press handling
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim()) handleSendMessage();
    }
  });

  // Click Trigger for Send
  btnSend.addEventListener("click", () => handleSendMessage());

  // Handle Suggestion Cards Trigger
  document.querySelectorAll(".card-suggestion").forEach((card) => {
    card.addEventListener("click", () => {
      const prompt = card.dataset.prompt;
      chatInput.value = prompt;
      btnSend.disabled = false;
      handleSendMessage();
    });
  });

  // Action: Processing Message Flow
  function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Reset Input
    chatInput.value = "";
    chatInput.style.height = "auto";
    btnSend.disabled = true;

    // Create Chat if none selected
    if (!currentChatId) {
      const newChat = {
        id: Date.now().toString(),
        title: text.length > 25 ? text.substring(0, 25) + "..." : text,
        messages: [],
      };
      chats.unshift(newChat);
      currentChatId = newChat.id;
    }

    // Append User Message
    const userMsg = { sender: "user", text, timestamp: getTimestamp() };
    saveMessageToCurrentChat(userMsg);
    renderMessages();

    // Show Typing State
    showTypingIndicator();

    // Call Groq API asynchronously
    (async () => {
      const aiResponseText = await sendMessageToAI(text);
      removeTypingIndicator();
      const aiMsg = {
        sender: "ai",
        text: aiResponseText,
        timestamp: getTimestamp(),
      };
      saveMessageToCurrentChat(aiMsg);
      renderMessages();
    })();
  }

  /*
    =======================================================
    LIVE GROQ API INTEGRATION
    =======================================================
  */
  /*
    =======================================================
    LIVE GROQ API INTEGRATION (With Custom Profile System)
    =======================================================
  */
  async function sendMessageToAI(userPrompt) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
      return "Error: API key missing! File ke top par GROQ_API_KEY variable mein apni gsk_... wali valid key add karein.";
    }

    const API_URL = "https://api.groq.com/openai/v1/chat/completions";

    // Aap ki personal details jo AI ko train karengi
    const systemInstruction = `
      I'm Haseeb raza personal AI assistant. I'm here to help you learn more about his full-stack web development skills, projects, and how to get in touch with him. How can I assist you today?
      - Naam: [Haseeb Raza Shahid]
      - Location: [Narowal/Pakistan]
      - Profession/Bio: [Aap kya karte hain, e.g., Web Developer / Student]
      - Social Media Handles:
        * Instagram: [haseebraza385]
        * GitHub/LinkedIn: [https://www.linkedin.com/in/haseeb-raza-shahid-96859b390/]
        * YouTube/Facebook: [https://web.facebook.com/profile.php?id=61583893588757]
      Baki tamam aam sawalon ke jawab normally friendly and helpful tone mein dein.
    `;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: systemInstruction,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Groq API Error Detail:", data);
        return `API Error (${response.status}): ${data.error?.message || "Request failed"}`;
      }

      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
      } else {
        return "Sorry, unexpected response format received from Groq API.";
      }
    } catch (error) {
      console.error("Groq API Connection Failure:", error);
      return "Network Error: Groq API se connection nahi ho saka. Internet connection aur API Key validity check karein.";
    }
  }

  // Persistence helpers
  function saveMessageToCurrentChat(msg) {
    const activeChat = chats.find((c) => c.id === currentChatId);
    if (activeChat) {
      activeChat.messages.push(msg);
      saveState();
      renderHistory();
    }
  }

  function saveState() {
    localStorage.setItem("novaai_chats", JSON.stringify(chats));
  }

  // Render History in Sidebar
  function renderHistory() {
    chatHistoryList.innerHTML = "";

    if (chats.length === 0) {
      chatHistoryList.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-secondary); padding: 0.5rem;">No chats yet</div>`;
      return;
    }

    chats.forEach((chat) => {
      const item = document.createElement("div");
      item.className = `history-item ${chat.id === currentChatId ? "active" : ""}`;
      item.innerHTML = `
        <span class="title"><i class="fa-regular fa-message"></i> ${escapeHTML(chat.title)}</span>
        <i class="fa-solid fa-trash delete-btn" title="Delete"></i>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
          e.stopPropagation();
          deleteChat(chat.id);
        } else {
          currentChatId = chat.id;
          renderHistory();
          renderMessages();
          closeMobileSidebar();
        }
      });

      chatHistoryList.appendChild(item);
    });
  }

  // Render Messages Viewport
  function renderMessages() {
    const activeChat = chats.find((c) => c.id === currentChatId);

    if (!activeChat || activeChat.messages.length === 0) {
      welcomeScreen.classList.remove("hidden");
      messagesContainer.classList.add("hidden");
      return;
    }

    welcomeScreen.classList.add("hidden");
    messagesContainer.classList.remove("hidden");
    messagesContainer.innerHTML = "";

    activeChat.messages.forEach((msg) => {
      const row = document.createElement("div");
      row.className = `message-row ${msg.sender}`;

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";

      if (msg.sender === "user") {
        bubble.innerHTML = `${escapeHTML(msg.text)}`;
      } else {
        bubble.innerHTML = `${formatMarkdown(msg.text)}`;
      }

      // Actions bar
      const actions = document.createElement("div");
      actions.className = "message-actions";
      const copyBtn = document.createElement("button");
      copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(msg.text);
        showToast("Copied to clipboard");
      });
      actions.appendChild(copyBtn);
      bubble.appendChild(actions);

      if (msg.sender === "ai") {
        const avatar = document.createElement("div");
        avatar.className = "avatar-ai";
        avatar.innerHTML = `<i class="fa-solid fa-brain"></i>`;
        row.appendChild(avatar);
      }

      row.appendChild(bubble);
      messagesContainer.appendChild(row);
    });

    // Auto scroll down
    document.getElementById("chat-viewport").scrollTop =
      document.getElementById("chat-viewport").scrollHeight;
  }

  function deleteChat(id) {
    chats = chats.filter((c) => c.id !== id);
    if (currentChatId === id) currentChatId = chats.length ? chats[0].id : null;
    saveState();
    renderHistory();
    renderMessages();
    showToast("Conversation deleted");
  }

  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "typing-indicator";
    indicator.className = "message-row ai";
    indicator.innerHTML = `
      <div class="avatar-ai"><i class="fa-solid fa-brain"></i></div>
      <div class="message-bubble"><em>NovaAI is thinking...</em></div>
    `;
    messagesContainer.appendChild(indicator);
    document.getElementById("chat-viewport").scrollTop =
      document.getElementById("chat-viewport").scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
  }

  // Formatting & Utility Helpers
  function formatMarkdown(text) {
    return escapeHTML(text)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function escapeHTML(str) {
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[tag] || tag,
    );
  }

  function getTimestamp() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // New Chat Triggers
  document
    .getElementById("btn-new-chat-sidebar")
    .addEventListener("click", startNewChat);
  document
    .getElementById("btn-new-chat-header")
    .addEventListener("click", startNewChat);

  function startNewChat() {
    currentChatId = null;
    renderHistory();
    renderMessages();
    closeMobileSidebar();
  }

  // Mobile Sidebar Toggles
  document.getElementById("btn-open-sidebar").addEventListener("click", () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
  });

  document
    .getElementById("btn-close-sidebar")
    .addEventListener("click", closeMobileSidebar);
  sidebarOverlay.addEventListener("click", closeMobileSidebar);

  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
  }

  // Settings Modal Controls
  const openModal = () => settingsModal.classList.remove("hidden");
  const closeModal = () => settingsModal.classList.add("hidden");

  document
    .getElementById("btn-open-settings")
    .addEventListener("click", openModal);
  document
    .getElementById("btn-header-settings")
    .addEventListener("click", openModal);
  document.getElementById("close-modal").addEventListener("click", closeModal);

  // Clear All Data
  document.getElementById("btn-clear-all").addEventListener("click", () => {
    if (confirm("Clear all conversation history?")) {
      chats = [];
      currentChatId = null;
      saveState();
      renderHistory();
      renderMessages();
      closeModal();
      showToast("All history cleared");
    }
  });

  // Theme Switcher
  const themeToggleBtn = document.getElementById("theme-toggle");
  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.getAttribute("data-theme") === "light";
    if (isLight) {
      document.body.removeAttribute("data-theme");
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      document.body.setAttribute("data-theme", "light");
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  });
});
