"use strict";

// Переменные для управления чатом
let chats = [];
let currentChatIndex = null;

// Получение элементов DOM
const chatContainer = document.getElementById("chatContainer");
const chatList = document.getElementById("chatList");
const userInput = document.getElementById("userInput");
const welcomeMessage = document.querySelector(".welcome-message");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const requestPanel = document.querySelector(".request-panel");
const textarea = document.querySelector(".request__input");
const micBtn = document.getElementById("micBtn");
const audioRec = new Audio("/static/audio/recording.mp3");
const btnChatPanel = document.querySelector(".btn-chat-panel");
const btnNewChat = document.querySelector(".btn-new-chat-panel");
const btnDelChat = document.querySelector(".btn-del-chat-panel");
const panels = document.querySelectorAll(".panel");
const themeToggle = document.getElementById("theme-toggle");
const scrollButton = document.createElement("scroll");
document.body.appendChild(scrollButton);

// Функции работы с localStorage
function setLocalStorage() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

function getLocalStorage() {
  const data = localStorage.getItem("chats");
  chats = data ? JSON.parse(data) : [];
  updateChatList();
}

// Вспомогательная функция для сокращения длинных сообщений
function getShortenedContent(content, maxLength = 25) {
  return content.length > maxLength
    ? content.slice(0, maxLength) + "..."
    : content;
}

// Обновляем список чатов в левой колонке
function updateChatList() {
  chatList.innerHTML = "";
  chats.forEach((chat, index) => {
    const newChatItem = document.createElement("li");
    const firstMessageContent = chat.messages[0]?.content || "Пустой чат";
    newChatItem.textContent = getShortenedContent(firstMessageContent);
    newChatItem.addEventListener("click", () => loadChat(index));
    chatList.appendChild(newChatItem);
  });
}

// Загружаем выбранный чат и отображаем его в центральном чате
function loadChat(index) {
  currentChatIndex = index;
  const chat = chats[index];
  chatContainer.innerHTML = "";

  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
  }
  requestPanel.classList.remove("welcome");
  requestPanel.classList.add("visible");
  runOnMobile();

  chat.messages.forEach((msg) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add(
      msg.role === "user" ? "user-message" : "assistant-message"
    );
    messageElement.textContent = msg.content;
    chatContainer.appendChild(messageElement);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Сохраняем новый чат в массив и обновляем интерфейс
function saveChat(firstMessage) {
  const chatIndex = chats.length;
  chats.push({
    messages: [{ role: "user", content: firstMessage }],
  });

  const newChatItem = document.createElement("li");
  newChatItem.textContent = getShortenedContent(firstMessage);
  newChatItem.addEventListener("click", () => loadChat(chatIndex));
  chatList.appendChild(newChatItem);

  setLocalStorage();
}

// Функция для отправки сообщения и получения ответа от AI
async function sendMessage() {
  const userInputValue = userInput.value.trim();
  if (!userInputValue) return;

  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
  }
  requestPanel.classList.remove("welcome");
  requestPanel.classList.add("visible");

  if (currentChatIndex === null) {
    saveChat(userInputValue);
    currentChatIndex = chats.length - 1;
  } else {
    chats[currentChatIndex].messages.push({
      role: "user",
      content: userInputValue,
    });
  }

  setLocalStorage();

  textarea.value = "";
  textarea.style.height = "auto";

  const userMessage = document.createElement("div");
  userMessage.classList.add("user-message");
  userMessage.textContent = userInputValue;
  chatContainer.appendChild(userMessage);

  userInput.value = "";

  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  const systemPrompt = [
    {
      role: "system",
      content: CONFIG.systemPrompt,
    },
    ...chats[currentChatIndex].messages,
  ];

  const configApp = [];

  const assistantMessageElement = document.createElement("div");
  assistantMessageElement.classList.add("assistant-message");
  chatContainer.appendChild(assistantMessageElement);

  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  const apiUrl = `${CONFIG.apiUrl}/v1/chat/completions`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: systemPrompt,
        temperature: CONFIG.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      switch (response.status) {
        case 401:
          alert("Ошибка: Вы не авторизованы. Проверьте API ключ.");
          break;
        case 403:
          alert(
            "Ошибка: Оплаченный период истек. Проверьте подписку на OpenAI API."
          );
          break;
        default:
          alert(`Ошибка HTTP: ${response.status}`);
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";
    let buffer = "";
    let doneReading = false;

    while (!doneReading) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          const jsonString = line.replace("data: ", "").trim();
          if (jsonString === "[DONE]") {
            doneReading = true;
            break;
          }

          try {
            const parsedData = JSON.parse(jsonString);
            const content = parsedData.choices[0].delta?.content || "";
            assistantMessage += content;
            assistantMessageElement.innerHTML = assistantMessage;

            if (shouldAutoScroll) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch (error) {
            console.error(
              "Ошибка при разборе JSON:",
              error,
              "Строка JSON:",
              jsonString
            );
          }
        }
      }
    }

    if (buffer.trim() && buffer.trim() !== "[DONE]") {
      try {
        const jsonString = buffer.replace("data: ", "").trim();
        const parsedData = JSON.parse(jsonString);
        const content = parsedData.choices[0].delta?.content || "";
        assistantMessage += content;
        assistantMessageElement.innerHTML = assistantMessage;
      } catch (error) {
        console.error(
          "Ошибка при разборе JSON в оставшемся буфере:",
          error,
          "Строка JSON:",
          buffer
        );
      }
    }

    chats[currentChatIndex].messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    setLocalStorage();
  } catch (error) {
    console.error("Ошибка при получении ответа от сервера:", error);
    alert("Ошибка: Невозможно обработать ответ от сервера.");
  }
}

// Функция для отслеживания ручной прокрутки
let shouldAutoScroll = true;
chatContainer.addEventListener("scroll", () => {
  const isAtBottom =
    chatContainer.scrollTop + chatContainer.clientHeight >=
    chatContainer.scrollHeight - 10;
  if (!isAtBottom) {
    shouldAutoScroll = false;
    scrollButton.style.display = "block";
  } else {
    shouldAutoScroll = true;
    scrollButton.style.display = "none";
  }
});

// Функция для включения автопрокрутки по клику на кнопку
scrollButton.addEventListener("click", () => {
  shouldAutoScroll = true;
  chatContainer.scrollTop = chatContainer.scrollHeight;
  scrollButton.style.display = "none";
});

// Отправка сообщения при нажатии кнопки "Отправить"
sendMessageBtn.addEventListener("click", sendMessage);

// Отправка сообщения при нажатии клавиши Enter
userInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

// Функция для управления состоянием панели
function runOnMobile() {
  if (isMobile()) {
    removeActivePanel();
  } else {
    setTimeout(activateActivePanel, 2000);
  }
}

// Проверка мобильного разрешения
function isMobile() {
  return window.matchMedia("(max-width: 480px)").matches;
}

// Функция для удаления класса "active" у всех панелей
function removeActivePanel() {
  panels.forEach((panel) => panel.classList.remove("active"));
}

// Функция для активации всех панелей
function activateActivePanel() {
  panels.forEach((panel) => panel.classList.add("active"));
}

// Обработчик клика для переключения панели
btnChatPanel.addEventListener("click", function () {
  panels.forEach((panel) => {
    panel.classList.toggle("active");
  });
});

// Запускаем проверку разрешения при загрузке страницы
runOnMobile();

// Слушаем изменение размеров экрана и пересчитываем состояние
window.addEventListener("resize", runOnMobile);

// Темная тема и ее сохранение при обновлении
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
} else {
  document.body.classList.remove("dark-mode");
}

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-mode") ? "dark" : "light"
  );
});

// Новый чат
btnNewChat.addEventListener("click", function () {
  chatContainer.innerHTML = "";
  currentChatIndex = null;
  updateChatList();
  userInput.value = "";
  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
  }
  requestPanel.classList.remove("welcome");
  requestPanel.classList.add("visible");
  runOnMobile();
});

// Очищаем историю чатов
btnDelChat.addEventListener("click", function () {
  chats = [];
  currentChatIndex = null;
  chatList.innerHTML = "";
  chatContainer.innerHTML = "";
  setLocalStorage();
});

// Автоматическое изменение высоты текстового поля
textarea.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
  this.style.overflowY =
    this.scrollHeight > parseInt(getComputedStyle(this).maxHeight)
      ? "auto"
      : "hidden";
});

// Отправка сообщения при нажатии "Enter"
textarea.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  getLocalStorage();
  showWelcomeMessage();

  setTimeout(function () {
    requestPanel.classList.add("visible");
  }, 1000);
});

// Приветствие
function typeWriter(elem, text, speed) {
  let i = 0;
  (function typing() {
    if (i < text.length) {
      elem.innerHTML += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    }
  })();
}

function showWelcomeMessage() {
  let welcomeMessage = document.querySelector(".welcome-message");
  if (!welcomeMessage) {
    welcomeMessage = document.createElement("div");
    welcomeMessage.classList.add("welcome-message");
    document.body.appendChild(welcomeMessage);
  } else {
    welcomeMessage.style.display = "block";
    welcomeMessage.innerHTML = "";
  }

  const welcomeText = "Привет! Я – МозгоБот. Чем могу помочь?";
  setTimeout(function () {
    typeWriter(welcomeMessage, welcomeText, 10);
  }, 2000);
}

// Голосовой ввод через микрофон
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const languages = ["ru-RU", "en-US"];
  let currentLangIndex = 0;

  micBtn.addEventListener("click", () => {
    audioRec.play();
    currentLangIndex = 0;
    startRecognition(languages[currentLangIndex]);
    micBtn.classList.add("recording");
    recognition.addEventListener("end", () => {
      micBtn.classList.remove("recording");
    });
  });

  function startRecognition(lang) {
    recognition.lang = lang;
    recognition.start();
    console.log(`Распознавание запущено на языке: ${lang}`);
  }

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    console.log(`Распознанный текст: ${transcript}`);
    userInput.value = transcript;
  });

  recognition.addEventListener("error", (event) => {
    if (["no-speech", "nomatch"].includes(event.error)) {
      console.log(`Ошибка распознавания на языке: ${recognition.lang}`);
      currentLangIndex++;
      if (currentLangIndex < languages.length) {
        startRecognition(languages[currentLangIndex]);
      } else {
        console.log("Не удалось распознать речь ни на одном языке.");
      }
    } else {
      console.error("Ошибка распознавания:", event.error);
    }
  });

  recognition.addEventListener("end", () => {
    console.log("Запись завершена");
  });
} else {
  micBtn.style.display = "none";
}
