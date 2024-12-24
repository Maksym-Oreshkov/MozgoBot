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
const mainLogoCover = document.querySelector(".main-logo-cover");
const logoElement = document.getElementById("logo-text");
const optionsBtn = document.getElementById("options-button");
const promptButtons = document.querySelectorAll(".promptBtn");
const predefinedContainer = document.querySelector(".predefined-container");
document.body.appendChild(scrollButton);

// AbortController для возможности отмены запроса
let abortController = null;

// Функции работы с localStorage
function setLocalStorage() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

function getLocalStorage() {
  const data = localStorage.getItem("chats");
  chats = data ? JSON.parse(data) : [];
  updateChatList();
}

// Вспомогательная функция для сокращения длинных сообщений(возможно пригодится)

/* function getShortenedContent(content, maxLength = 20) {
  return content.length > maxLength
    ? content.slice(0, maxLength) + "..."
    : content;
} */

// Обновляем список чатов в левой колонке
function updateChatList() {
  chatList.innerHTML = "";
  chats.forEach((chat, index) => {
    const newChatItem = document.createElement("li");
    const firstMessageContent = chat.messages[0]?.content || "Пустой чат";
    newChatItem.textContent = firstMessageContent;
    newChatItem.addEventListener("click", () => loadChat(index));
    chatList.appendChild(newChatItem);
  });
  chatList.scrollTop = chatList.scrollHeight;
}

function loadChat(index) {
  currentChatIndex = index;
  const chat = chats[index];
  chatContainer.innerHTML = "";
  mainLogoCover.classList.remove("visible");

  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
    predefinedContainer.style.display = "none";
  }
  requestPanel.classList.remove("welcome");
  requestPanel.classList.add("visible");
  runOnMobile();

  chat.messages.forEach((msg) => {
    if (msg.role === "assistant") {
      // Создание элемента сообщения ассистента
      const assistantMessageElement = document.createElement("div");
      assistantMessageElement.classList.add("assistant-message", "message");

      // Создание контейнера для текста ответа ассистента
      const assistantResponseContainer = document.createElement("div");
      assistantResponseContainer.classList.add("assistant-response-container");
      assistantResponseContainer.innerHTML = marked.parse(msg.content);

      assistantMessageElement.appendChild(assistantResponseContainer);

      // Создание кнопки "Копировать"
      const copyButton = document.createElement("button");
      copyButton.textContent = "Копировать";
      copyButton.classList.add("copy-button");

      // Добавление обработчика события для кнопки копирования
      copyButton.addEventListener("click", () => {
        if (navigator.clipboard && window.isSecureContext) {
          const plainText = assistantResponseContainer.innerText;
          navigator.clipboard
            .writeText(plainText)
            .then(() => {
              // Отображаем уведомление об успешном копировании
              copyButton.textContent = "Cкопированно ✓";
              /*               alert("Ответ скопирован в буфер обмена!"); */
            })
            .catch((err) => {
              console.error("Ошибка при копировании: ", err);
              alert("Не удалось скопировать текст.");
            });
        } else {
          alert("Копирование не поддерживается в вашем браузере.");
        }
      });

      assistantMessageElement.appendChild(copyButton);

      // Добавление элемента сообщения ассистента в контейнер чата
      chatContainer.appendChild(assistantMessageElement);
    } else {
      // Для сообщений пользователя
      const userMessageElement = document.createElement("div");
      userMessageElement.classList.add("user-message", "message");
      userMessageElement.textContent = msg.content;
      chatContainer.appendChild(userMessageElement);
    }
  });

  // Прокрутка вниз после загрузки чата
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Сохраняем новый чат в массив и обновляем интерфейс
function saveChat(firstMessage) {
  const chatIndex = chats.length;
  chats.push({
    messages: [{ role: "user", content: firstMessage }],
  });

  const newChatItem = document.createElement("li");
  newChatItem.textContent = firstMessage;
  newChatItem.addEventListener("click", () => loadChat(chatIndex));
  chatList.appendChild(newChatItem);

  setLocalStorage();
}

//  Функция для изменения состояния кнопки отправки
function toggleSendButton(isSending) {
  if (isSending) {
    sendMessageBtn.classList.add("stop-button"); // Добавляем класс для стилизации как стоп
    sendMessageBtn.title = "Остановить запрос";
    // Можно изменить иконку кнопки здесь, если используется иконка
  } else {
    sendMessageBtn.disabled = false;
    sendMessageBtn.classList.remove("stop-button");
    sendMessageBtn.title = "Отправить сообщение";
    // Восстанавливаем иконку кнопки отправки
  }
}

// Пасхалка //

document.addEventListener("keydown", (event) => {
  // Проверяем, что фокус не в инпуте или текстовом поле
  const targetTag = event.target.tagName.toLowerCase();
  if (targetTag === "input" || targetTag === "textarea") {
    return; // Выходим, если сейчас введение идёт в поле ввода
  }

  if (event.key === "ё" || event.key === "Ё") {
    logoElement.textContent = "MozgoЁб";
  }
});

document.addEventListener("keyup", (event) => {
  // Аналогичная проверка для keyup
  const targetTag = event.target.tagName.toLowerCase();
  if (targetTag === "input" || targetTag === "textarea") {
    return;
  }

  if (event.key === "ё" || event.key === "Ё") {
    logoElement.textContent = "MozgoBot";
  }
});

async function sendMessage() {
  const userInputValue = userInput.value.trim();
  if (!userInputValue) return;

  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
    predefinedContainer.style.display = "none";
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

  // Создание элемента сообщения пользователя
  const userMessage = document.createElement("div");
  userMessage.classList.add("user-message", "message");
  userMessage.textContent = userInputValue;
  chatContainer.appendChild(userMessage);

  // Триггер анимации появления
  setTimeout(() => {
    userMessage.classList.add("visible");
  }, 10); // Небольшая задержка для запуска CSS-перехода

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

  // Создание элемента сообщения ассистента
  const assistantMessageElement = document.createElement("div");
  assistantMessageElement.classList.add("assistant-message", "message");
  chatContainer.appendChild(assistantMessageElement);

  // Создание контейнера для текста ответа ассистента
  const assistantResponseContainer = document.createElement("div");
  assistantResponseContainer.classList.add("assistant-response-container");
  assistantMessageElement.appendChild(assistantResponseContainer);

  // Добавление элемента сообщения ассистента в контейнер чата
  chatContainer.appendChild(assistantMessageElement);

  setTimeout(() => {
    assistantMessageElement.classList.add("visible");
  }, 10);

  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  const apiUrl = `${CONFIG.apiUrl}/v1/chat/completions`;

  // Инициализируем AbortController
  abortController = new AbortController();
  const { signal } = abortController;

  // Меняем кнопку отправки на стоп
  toggleSendButton(true);

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
        max_tokens: CONFIG.max_tokens,
        stream: true,
      }),
      signal, // Передаём сигнал для возможности отмены
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          const jsonString = line.replace("data: ", "").trim();
          if (jsonString === "[DONE]") {
            break; // Заменяем return на break
          }

          try {
            const parsedData = JSON.parse(jsonString);
            const content = parsedData.choices[0].delta?.content || "";
            assistantMessage += content;

            // Используем marked для преобразования Markdown в HTML
            const htmlContent = marked.parse(assistantMessage);
            assistantResponseContainer.innerHTML = htmlContent;

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

        // Обновляем HTML с использованием marked
        const htmlContent = marked.parse(assistantMessage);
        assistantResponseContainer.innerHTML = htmlContent;

        // Сохраняем оставшиеся данные
        chats[currentChatIndex].messages.push({
          role: "assistant",
          content: assistantMessage,
        });
        setLocalStorage();
      } catch (error) {
        console.error(
          "Ошибка при разборе JSON в оставшемся буфере:",
          error,
          "Строка JSON:",
          buffer
        );
      }
    }

    // Финальное сохранение сообщения
    chats[currentChatIndex].messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    setLocalStorage();
    // Создание кнопки копирования
    const copyButton = document.createElement("button");
    copyButton.textContent = "Копировать";
    copyButton.classList.add("copy-button");
    assistantMessageElement.appendChild(copyButton);

    // Добавление обработчика события для кнопки копирования
    copyButton.addEventListener("click", () => {
      if (navigator.clipboard && window.isSecureContext) {
        const plainText = assistantResponseContainer.innerText;
        navigator.clipboard
          .writeText(plainText)
          .then(() => {
            copyButton.textContent = "Cкопированно ✓";
            /*             alert("Ответ скопирован в буфер обмена!"); */
          })
          .catch((err) => {
            console.error("Ошибка при копировании: ", err);
            alert("Не удалось скопировать текст.");
          });
      } else {
        alert("Копирование не поддерживается в вашем браузере.");
      }
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Запрос был прерван пользователем.");
      chats[currentChatIndex].messages.push({
        role: "assistant",
        content: assistantMessageElement.innerHTML || assistantMessage,
      });
      setLocalStorage();
    } else {
      console.error("Ошибка при получении ответа от сервера:", error);
    }
  } finally {
    toggleSendButton(false);
    abortController = null;
  }
}

// Функция для остановки запроса
function stopMessage() {
  if (abortController) {
    abortController.abort();
  }
}

// Обработчик клика для кнопки отправки/остановки
sendMessageBtn.addEventListener("click", () => {
  if (abortController) {
    // Если запрос уже отправлен, остановить его
    stopMessage();
  } else {
    // Отправить сообщение
    sendMessage();
    mainLogoCover.classList.remove("visible");
  }
});

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
    mainLogoCover.classList.remove("visible");
  } else {
    stopMessage();
  }
});

// Функция для управления состоянием панели
function runOnMobile() {
  if (isMobile()) {
    // Логика для мобильных устройств
    removeActivePanel();
  } else if (isTernedMobile()) {
    // Логика для планшетов
    removeActivePanel();
  } else {
    // Логика для десктопа
    setTimeout(activateActivePanel, 2000);
  }
}

// Проверка мобильного разрешения
function isMobile() {
  return window.matchMedia("(max-width: 480px)").matches;
}

function isTernedMobile() {
  return window.matchMedia("(max-height: 460px)").matches;
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
  mainLogoCover.classList.add("visible");
  updateChatList();
  userInput.value = "";
  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
    predefinedContainer.style.display = "none";
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
  mainLogoCover.classList.add("visible");
  requestPanel.classList.remove("welcome");
  requestPanel.classList.add("visible");
  welcomeMessage.style.display = "none";
  predefinedContainer.style.display = "none";
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

document.addEventListener("DOMContentLoaded", function () {
  getLocalStorage();
  showWelcomeMessage();
  mainLogoCover.classList.add("visible");

  setTimeout(function () {
    requestPanel.classList.add("visible");
    mainLogoCover.classList.remove("visible");
  }, 1000);
});

setTimeout(function () {
  predefinedContainer.classList.add("visible");
}, 2800);

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

  const welcomeText = CONFIG.welcomeText;
  setTimeout(function () {
    typeWriter(welcomeMessage, welcomeText, 20);
  }, 2200);
}

optionsBtn.addEventListener("click", function () {
  document.querySelector(".options").classList.toggle("active");
});

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const promptText = button.getAttribute("data-prompt");
    sendPredefinedPrompt(promptText);
  });
});

function sendPredefinedPrompt(promptText) {
  userInput.value = promptText;
  sendMessage();
}

// Новогодний Ивент

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let w = window.innerWidth;
let h = window.innerHeight;
canvas.width = w;
canvas.height = h;

// Массив частиц
let particles = [];

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 8 + 1;
    this.life = 180; // примерно 3 секунды при 60fps
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 3 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    this.alpha = this.life / 180;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// Функция анимации
function animate() {
  ctx.clearRect(0, 0, w, h);

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw(ctx);

    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  if (particles.length > 0) {
    requestAnimationFrame(animate);
  }
}

// Запуск искр
function spark(x, y) {
  const colors = [
    "rgba(255,223,0,1)", // золотистый
    "rgba(255,140,0,1)", // оранжевый
    "rgba(255,255,255,1)", // белый
  ];

  for (let i = 0; i < 100; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(x, y, c));
  }
}

// Функция, запускающая анимацию
function runSparkAnimation() {
  // Обновляем размеры и очищаем массив частиц
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  particles = [];

  // Запуск анимации в центре экрана
  spark(w / 2, h / 2);
  animate();
}

// При загрузке запустить анимацию один раз
window.onload = runSparkAnimation;

// Адаптация под изменение размера окна
window.addEventListener("resize", () => {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
});

// Анимация снега

(function () {
  const snowCanvas = document.getElementById("snowCanvas");
  const snowCtx = snowCanvas.getContext("2d");

  let snowW = window.innerWidth;
  let snowH = window.innerHeight;
  snowCanvas.width = snowW;
  snowCanvas.height = snowH;

  const numFlakes = 200;
  const flakes = [];

  // Инициализация снежинок с y = -r (выходят сверху экрана)
  for (let i = 0; i < numFlakes; i++) {
    flakes.push({
      x: Math.random() * snowW,
      y: -Math.random() * snowH, // Все снежинки начинают за пределами экрана сверху
      r: Math.random() * 3 + 1,
      d: Math.random() * 0.5 + 0.5,
    });
  }

  let angle = 0;

  // Функция рисования снежинок
  function drawSnow() {
    snowCtx.clearRect(0, 0, snowW, snowH);
    snowCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
    snowCtx.beginPath();
    for (let i = 0; i < numFlakes; i++) {
      let f = flakes[i];
      snowCtx.moveTo(f.x, f.y);
      snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
    }
    snowCtx.fill();
    moveFlakes();
    requestAnimationFrame(drawSnow);
  }

  // Функция перемещения снежинок
  function moveFlakes() {
    angle = 1;
    for (let i = 0; i < numFlakes; i++) {
      let f = flakes[i];
      f.y += Math.pow(f.d, 2) + 0.1;
      f.x += Math.sin(angle) * 0.5;
      // Перемещение снежинок обратно сверху, если они упали ниже
      if (f.y > snowH) {
        f.y = -f.r;
        f.x = Math.random() * snowW;
      }
    }
  }

  setTimeout(() => {
    drawSnow();
  }, 2000);

  // Адаптация к изменению размера окна
  window.addEventListener("resize", () => {
    snowW = window.innerWidth;
    snowH = window.innerHeight;
    snowCanvas.width = snowW;
    snowCanvas.height = snowH;
  });
})();

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
