"use strict";

// Переменные для управления чатом
let chats = [];
let currentChatIndex = null;

const chatContainer = document.getElementById("chatContainer");
const chatList = document.getElementById("chatList");
const userInput = document.getElementById("userInput");
const welcomeMessage = document.querySelector(".welcome-message");

function setLocalStorage() {
  localStorage.setItem("chats", JSON.stringify(chats));
}

function getLocalStorage() {
  const data = localStorage.getItem("chats");
  chats = data ? JSON.parse(data) : []; // Загружаем чаты или создаем пустой массив, если данных нет
  updateChatList(); // Обновляем интерфейс с загруженными данными
}

// Вспомогательная функция для сокращения длинных сообщений
function getShortenedContent(content, maxLength = 50) {
  if (content.length > maxLength) {
    return content.slice(0, maxLength) + "..."; // Обрезаем и добавляем многоточие
  }
  return content; // Возвращаем полное сообщение, если оно короткое
}

// Обновляем список чатов в левой колонке
function updateChatList() {
  chatList.innerHTML = ""; // Очищаем старый список чатов

  chats.forEach((chat, index) => {
    const newChatItem = document.createElement("li");
    const firstMessageContent = chat.messages[0]?.content || "Пустой чат";
    newChatItem.textContent = getShortenedContent(firstMessageContent); // Сокращаем сообщение
    newChatItem.addEventListener("click", () => loadChat(index)); // При нажатии загружаем выбранный чат
    chatList.appendChild(newChatItem);
  });
}

// Загружаем выбранный чат и отображаем его в центральном чате
function loadChat(index) {
  currentChatIndex = index;
  const chat = chats[index];

  // Очищаем текущее содержимое чата
  chatContainer.innerHTML = "";

  chat.messages.forEach((msg) => {
    requestPanel.classList.remove("welcome");
    requestPanel.classList.add("visible");
    runOnMobile();
    // Скрываем приветственное сообщение
    if (welcomeMessage) {
      welcomeMessage.style.display = "none";
    }
    const messageElement = document.createElement("div");
    // Добавляем стили в зависимости от роли сообщения (user или assistant)
    if (msg.role === "user") {
      messageElement.classList.add("user-message");
      messageElement.textContent = `${msg.content}`;
    } else {
      messageElement.classList.add("assistant-message");
      messageElement.textContent = `${msg.content}`;
    }
    chatContainer.appendChild(messageElement);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight; // Прокручиваем чат вниз
}

// Сохраняем новый чат в массив и обновляем интерфейс
function saveChat(firstMessage) {
  const chatIndex = chats.length;
  // Создаем новый чат с первым сообщением пользователя
  chats.push({
    messages: [{ role: "user", content: firstMessage }],
  });

  // Добавляем новый элемент в список чатов в левой колонке
  const newChatItem = document.createElement("li");
  newChatItem.textContent = getShortenedContent(firstMessage);
  newChatItem.textContent = getShortenedContent(firstMessage); // Сокращаем сообщение
  newChatItem.addEventListener("click", () => loadChat(chatIndex)); // При нажатии загружаем чат
  chatList.appendChild(newChatItem);

  setLocalStorage(); // Сохраняем локально
}

let shouldAutoScroll = true; // По умолчанию включаем автопрокрутку, если нужно
const scrollButton = document.createElement("scroll");

document.body.appendChild(scrollButton);

// Функция для отправки сообщения и получения ответа от AI
async function sendMessage() {
  const userInputValue = userInput.value.trim(); // Получаем сообщение пользователя

  if (!userInputValue) return; // Если сообщение пустое, ничего не делаем
  // Скрыть приветственное сообщение

  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
  }

  if (requestPanel.classList.contains("welcome")) {
    requestPanel.classList.remove("welcome");
  }

  requestPanel.classList.add("visible");

  if (currentChatIndex === null) {
    // Если это новый чат, сохраняем его с первым сообщением
    saveChat(userInputValue);

    currentChatIndex = chats.length - 1; // Устанавливаем текущий активный чат
  } else {
    // Добавляем сообщение в существующий чат
    chats[currentChatIndex].messages.push({
      role: "user",
      content: userInputValue,
    });
  }

  // Сохраняем в localStorage
  setLocalStorage();

  textarea.value = "";
  textarea.style.height = "auto"; // Возвращаем строку в исходный вид!
  const userMessage = document.createElement("div");
  userMessage.classList.add("user-message");
  userMessage.textContent = `${userInputValue}`;
  chatContainer.appendChild(userMessage);

  userInput.value = "";

  // Прокручиваем вниз только если автопрокрутка включена
  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  // Подготовим данные для API
  const systemPrompt = [
    {
      role: "system",
      content: CONFIG.systemPrompt,
    }, // Добавляем system prompt
    ...chats[currentChatIndex].messages, // Добавляем сообщения пользователя и ассистента
  ];

  // Объявляем переменную для отображения ответа
  let assistantMessageElement = document.createElement("div");
  assistantMessageElement.classList.add("assistant-message");
  chatContainer.appendChild(assistantMessageElement);

  // Прокручиваем вниз только если автопрокрутка включена
  if (shouldAutoScroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Формируем полный URL, комбинируя базовый URL и путь
  const apiUrl = `${CONFIG.apiUrl}/v1/chat/completions`;

  // Отправляем запрос к API OpenAI для получения ответа
  try {
    const response = await fetch(apiUrl, {
      // Используем CONFIG.apiUrl
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CONFIG.model, // Используем CONFIG.model
        messages: systemPrompt, // Используем массив с system prompt
        temperature: CONFIG.temperature, // Используем CONFIG.temperature
        max_tokens: CONFIG.max_tokens, // Используем CONFIG.max_tokens
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Ошибка: Вы не авторизованы. Проверьте API ключ.");
      } else if (response.status === 403) {
        alert(
          "Ошибка: Оплаченный период истек. Проверьте подписку на OpenAI API."
        );
      } else {
        alert(`Ошибка HTTP: ${response.status}`);
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";
    let buffer = ""; // Буфер для хранения неполных данных
    let doneReading = false;

    while (!doneReading) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let lines = buffer.split("\n");

      // Оставляем последнюю (возможно, неполную) строку в буфере
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
            // Обновляем отображение сообщения ассистента
            assistantMessageElement.innerHTML = `${assistantMessage}`;
            // Прокручиваем вниз, если автопрокрутка включена
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
    // После завершения чтения, проверяем оставшийся буфер
    if (buffer.trim() && buffer.trim() !== "[DONE]") {
      try {
        const jsonString = buffer.replace("data: ", "").trim();
        const parsedData = JSON.parse(jsonString);
        const content = parsedData.choices[0].delta?.content || "";
        assistantMessage += content;
        assistantMessageElement.innerHTML = `${assistantMessage}`;
      } catch (error) {
        console.error(
          "Ошибка при разборе JSON в оставшемся буфере:",
          error,
          "Строка JSON:",
          buffer
        );
      }
    }
    // Добавляем сообщение AI в текущий чат
    chats[currentChatIndex].messages.push({
      role: "assistant",
      content: assistantMessage,
    });

    // Сохраняем обновлённый чат в localStorage
    setLocalStorage();
  } catch (error) {
    console.error(
      "Ошибка при разборе JSON:",
      error,
      "Строка JSON:",
      jsonString
    );
    alert("Ошибка: Невозможно обработать ответ от сервера.");
  }
}

// Функция для отслеживания ручной прокрутки
chatContainer.addEventListener("scroll", () => {
  const isAtBottom =
    chatContainer.scrollTop + chatContainer.clientHeight >=
    chatContainer.scrollHeight - 10;
  if (!isAtBottom) {
    shouldAutoScroll = false;
    scrollButton.style.display = "block"; // Показываем кнопку для включения автопрокрутки
  } else {
    shouldAutoScroll = true;
    scrollButton.style.display = "none"; // Скрываем кнопку, если прокрутка внизу
  }
});

// Функция для включения автопрокрутки по клику на кнопку
scrollButton.addEventListener("click", () => {
  shouldAutoScroll = true;
  chatContainer.scrollTop = chatContainer.scrollHeight; // Прокручиваем вниз
  scrollButton.style.display = "none"; // Скрываем кнопку
});

// Отправка сообщения при нажатии кнопки "Отправить"
document
  .getElementById("sendMessageBtn")
  .addEventListener("click", sendMessage);

// Отправка сообщения при нажатии клавиши Enter
userInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Предотвращаем переход на новую строку
    sendMessage(); // Отправляем сообщение
  }
});

const audioRec = new Audio("/static/audio/recording.mp3");
const btnChatPanel = document.querySelector(".btn-chat-panel");
const btnNewChat = document.querySelector(".btn-new-chat-panel");
const btnDelChat = document.querySelector(".btn-del-chat-panel");
const panels = document.querySelectorAll(".panel");
const logoeBtn = document.querySelector(".logo");
const textarea = document.querySelector(".request__input");
const requestPanel = document.querySelector(".request-panel");
const micBtn = document.getElementById("micBtn");

// Функция для удаления класса "active" у всех панелей
function removeActivePanel() {
  panels.forEach((panel) => {
    panel.classList.remove("active");
  });
}

// Функция для активации всех панелей
function activateActivePanel() {
  panels.forEach((panel) => {
    panel.classList.add("active");
  });
}

// Функция для проверки мобильного разрешения
function isMobile() {
  return window.matchMedia("(max-width: 480px)").matches;
}

// Функция для управления состоянием панели
function runOnMobile() {
  if (isMobile()) {
    // Если мобильное разрешение, скрываем панель
    removeActivePanel();
  } else {
    // Если не мобильное разрешение, активируем панель с задержкой
    setTimeout(function () {
      activateActivePanel();
    }, 2000); // 2 секунды задержки
  }
}

// Обработчик клика для переключения панели
btnChatPanel.addEventListener("click", function () {
  panels.forEach((panel) => {
    if (panel.classList.contains("active")) {
      panel.classList.remove("active");
    } else {
      removeActivePanel();
      panel.classList.add("active");
    }
  });
});

// Запускаем проверку разрешения при загрузке страницы
runOnMobile();

// Слушаем изменение размеров экрана и пересчитываем состояние
window.addEventListener("resize", runOnMobile);

//// Темная тема и ее созранение при обнове /////
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
}

logoeBtn.addEventListener("click", function () {
  document.body.classList.toggle("dark-theme");

  // Save the current theme to localStorage
  if (document.body.classList.contains("dark-theme")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});

/////// Новый чат /////////

btnNewChat.addEventListener("click", function () {
  // Очистить панель чата
  chatContainer.innerHTML = "";

  // Сбросить индекс текущего чата
  currentChatIndex = null;

  // Обновить интерфейс
  updateChatList();

  // Очищаем поле ввода
  userInput.value = "";

  requestPanel.classList.remove("welcome");
  requestPanel.classList.add("visible");
  runOnMobile();
  // Скрываем приветственное сообщение
  if (welcomeMessage) {
    welcomeMessage.style.display = "none";
  }
});

/////// Очищаем историю чатов /////////

btnDelChat.addEventListener("click", function () {
  // Очищаем массив чатов
  chats = [];

  // Сбрасываем текущий индекс чата
  currentChatIndex = null;

  // Очищаем интерфейс: список чатов и окно чата
  chatList.innerHTML = "";
  chatContainer.innerHTML = "";

  // Сохраняем пустой массив в localStorage
  setLocalStorage();
});

////////////// Строка запроса /////////////////
textarea.addEventListener("input", function () {
  this.style.height = "auto"; // Сбрасываем высоту
  this.style.height = this.scrollHeight + "px"; // Устанавливаем новую высоту по контенту

  // Проверяем, превышает ли высота max-height
  if (this.scrollHeight > parseInt(getComputedStyle(this).maxHeight)) {
    this.style.overflowY = "auto"; // Включаем скролл, если текста слишком много
  } else {
    this.style.overflowY = "hidden"; // Убираем скролл, если текста достаточно мало
  }
});
// Отправка сообщения при нажатии "Enter"
textarea.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Предотвращаем переход на новую строку
    sendMessage(); // Вызываем функцию отправки сообщения
  }
});

document.addEventListener("DOMContentLoaded", function () {
  getLocalStorage();
  showWelcomeMessage();

  // Задержка перед появлением request-panel
  setTimeout(function () {
    requestPanel.classList.add("visible");
  }, 1000); // 1 секунды задержки
});

//// Приветствие //////

function typeWritter(elem, text, speed) {
  let i = 0;
  function typing() {
    if (i < text.length) {
      elem.innerHTML += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    }
  }
  typing();
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
    typeWritter(welcomeMessage, welcomeText, 10);
  }, 2000);
}

/////////// Голосовой ввод строки через микрофон /////////////////

// Проверяем поддержку Web Speech API
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Настройки распознавания
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  // Список поддерживаемых языков (русский и английский)
  const languages = ["ru-RU", "en-US"]; // Можно добавить больше языков
  let currentLangIndex = 0;

  // Функция для начала распознавания
  function startRecognition(lang) {
    recognition.lang = lang;
    recognition.start();
    console.log(`Распознавание запущено на языке: ${lang}`);
  }

  // Событие нажатия на микрофон
  micBtn.addEventListener("click", () => {
    audioRec.play();
    currentLangIndex = 0; // Сбрасываем на первый язык
    startRecognition(languages[currentLangIndex]);
    micBtn.classList.add("recording");
    recognition.addEventListener("end", () => {
      micBtn.classList.remove("recording");
    });
  });

  // Обработка успешного распознавания
  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    console.log(`Распознанный текст: ${transcript}`);
    userInput.value = transcript; // Вставляем распознанный текст в поле
  });

  // Попытка следующего языка при ошибке
  recognition.addEventListener("error", (event) => {
    if (event.error === "no-speech" || event.error === "nomatch") {
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

  // Событие завершения записи (если не было ошибок)
  recognition.addEventListener("end", () => {
    console.log("Запись завершена");
  });
} else {
  micBtn.style.display = "none";
  /*   console.error("Web Speech API не поддерживается вашим браузером."); */
}
