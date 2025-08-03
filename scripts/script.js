// Улучшенный компонент для загрузки HTML с поддержкой CSS
customElements.define(
  "ui-include",
  class extends HTMLElement {
    async connectedCallback() {
      let src = this.getAttribute("src");
      let cssFile = this.getAttribute("css");

      try {
        // Загружаем HTML контент
        const response = await fetch(src);
        const htmlContent = await response.text();
        this.innerHTML = htmlContent;

        // Если указан CSS файл, загружаем его
        if (cssFile) {
          await this.loadCSS(cssFile);
        }

        // Применяем подсветку синтаксиса к новому контенту
        if (typeof Prism !== "undefined") {
          Prism.highlightAllUnder(this);
        }

        // Запускаем событие для уведомления о загрузке компонента
        this.dispatchEvent(
          new CustomEvent("component-loaded", {
            bubbles: true,
            detail: { src, cssFile },
          })
        );
      } catch (error) {
        console.error(`Ошибка загрузки компонента ${src}:`, error);
        this.innerHTML = `<div class="error">Ошибка загрузки компонента</div>`;
      }
    }

    async loadCSS(cssFile) {
      return new Promise((resolve, reject) => {
        // Проверяем, не загружен ли уже этот CSS файл
        const existingLink = document.querySelector(`link[href="${cssFile}"]`);
        if (existingLink) {
          resolve();
          return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssFile;
        link.onload = () => resolve();
        link.onerror = () =>
          reject(new Error(`Не удалось загрузить CSS: ${cssFile}`));

        document.head.appendChild(link);
      });
    }
  }
);

let completedTasks = 0;
let hintsUsed = 0;
let quizResults = {};

// Функция для показа уведомлений
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `component-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Показываем уведомление
  setTimeout(() => notification.classList.add("show"), 100);

  // Скрываем и удаляем через 3 секунды
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

// Слушатель событий для загрузки компонентов
document.addEventListener("component-loaded", (event) => {
  const { src, cssFile } = event.detail;
  console.log(
    `Компонент загружен: ${src}${cssFile ? ` с CSS: ${cssFile}` : ""}`
  );

  // Показываем уведомление о загрузке
  showNotification(`Компонент ${src} успешно загружен!`);

  // Применяем подсветку синтаксиса
  if (typeof Prism !== "undefined") {
    Prism.highlightAll();
  }
});

// Обработчик ошибок загрузки
document.addEventListener("component-error", (event) => {
  const { src, error } = event.detail;
  showNotification(`Ошибка загрузки ${src}: ${error}`, "error");
});

// Функция для динамической загрузки компонентов
function loadComponent(src, cssFile = null, targetElement = null) {
  const includeElement = document.createElement("ui-include");
  includeElement.setAttribute("src", src);
  if (cssFile) {
    includeElement.setAttribute("css", cssFile);
  }

  if (targetElement) {
    targetElement.appendChild(includeElement);
  } else {
    document.querySelector(".tasks-container").appendChild(includeElement);
  }

  return includeElement;
}

// Функция для перезагрузки всех компонентов
function reloadAllComponents() {
  const components = document.querySelectorAll("ui-include");
  let reloadedCount = 0;

  components.forEach(async (component) => {
    const src = component.getAttribute("src");
    const cssFile = component.getAttribute("css");

    try {
      component.innerHTML =
        '<div class="loading-spinner"></div>Перезагрузка...';

      const response = await fetch(src + "?t=" + Date.now()); // Добавляем timestamp для обхода кеша
      const content = await response.text();
      component.innerHTML = content;

      if (cssFile) {
        // Перезагружаем CSS
        const existingLink = document.querySelector(`link[href="${cssFile}"]`);
        if (existingLink) {
          existingLink.href = cssFile + "?t=" + Date.now();
        }
      }

      reloadedCount++;
    } catch (error) {
      component.innerHTML = `<div class="error">Ошибка перезагрузки: ${error.message}</div>`;
    }
  });

  showNotification(`Перезагружено компонентов: ${reloadedCount}`);
}

function toggleTask(taskId) {
  const taskContent = document.getElementById(taskId);
  if (
    taskContent.style.display === "none" ||
    taskContent.style.display === ""
  ) {
    taskContent.style.display = "block";
  } else {
    taskContent.style.display = "none";
  }
}

function toggleHint(hintId) {
  const hint = document.getElementById(hintId);
  if (hint.style.display === "none" || hint.style.display === "") {
    hint.style.display = "block";
    hintsUsed++;
    document.getElementById("hintsUsed").textContent = hintsUsed;
  } else {
    hint.style.display = "none";
  }
}

function toggleSolution(solutionId) {
  const solution = document.getElementById(solutionId);
  if (solution.style.display === "none" || solution.style.display === "") {
    solution.style.display = "block";
    completedTasks++;
    document.getElementById("completedTasks").textContent = completedTasks;
    updateProgress();
  } else {
    solution.style.display = "none";
  }
}

function updateProgress() {
  const totalTasks = 60; // Обновляем общее количество с учетом задач на мапы
  const completed =
    completedTasks + Object.values(quizResults).filter((x) => x).length;
  const progress = (completed / totalTasks) * 100;
  document.getElementById("progressFill").style.width = progress + "%";
}

function checkQuiz(quizId) {
  const checkboxes = document.querySelectorAll(`input[data-quiz="${quizId}"]`);
  let selectedAnswers = [];
  let correctAnswer = null;

  // Сначала снимаем все чекбоксы кроме выбранного
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      selectedAnswers.push(checkbox.dataset.answer);
      correctAnswer = checkbox.dataset.answer;
    } else {
      checkbox.checked = false;
    }
  });

  if (selectedAnswers.length === 0) {
    alert("Пожалуйста, выберите один ответ!");
    return;
  }

  if (selectedAnswers.length > 1) {
    alert("Выберите только один ответ!");
    checkboxes.forEach((cb) => (cb.checked = false));
    return;
  }

  const resultDiv = document.getElementById(`result-${quizId}`);
  const explanationDiv = document.getElementById(`explanation-${quizId}`);
  const isCorrect = correctAnswer === "correct";

  // Отмечаем варианты ответов
  checkboxes.forEach((checkbox) => {
    const option = checkbox.closest(".quiz-option");
    option.classList.remove("correct", "wrong");

    if (checkbox.dataset.answer === "correct") {
      option.classList.add("correct");
    } else if (checkbox.checked) {
      option.classList.add("wrong");
    }
  });

  // Показываем результат
  resultDiv.style.display = "block";
  resultDiv.className = `quiz-result ${isCorrect ? "correct" : "wrong"}`;

  if (isCorrect) {
    resultDiv.innerHTML = "✅ Правильно! Отличное понимание работы слайсов!";
    quizResults[quizId] = true;
  } else {
    resultDiv.innerHTML = "❌ Неправильно. Изучите объяснение ниже.";
    quizResults[quizId] = false;
  }

  // Показываем объяснение
  explanationDiv.style.display = "block";

  updateProgress();
}

// Настройка автозагрузчика Prism.js для Go
window.Prism = window.Prism || {};
window.Prism.plugins = window.Prism.plugins || {};
window.Prism.plugins.autoloader = window.Prism.plugins.autoloader || {};
window.Prism.plugins.autoloader.languages_path =
  "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/";

// Обработчик для чекбоксов - только один может быть выбран
document.addEventListener("change", function (e) {
  if (e.target.type === "checkbox" && e.target.dataset.quiz) {
    const quizId = e.target.dataset.quiz;
    const checkboxes = document.querySelectorAll(
      `input[data-quiz="${quizId}"]`
    );

    if (e.target.checked) {
      checkboxes.forEach((cb) => {
        if (cb !== e.target) {
          cb.checked = false;
        }
      });
    }
  }
});

// Функции для работы с табами
function showTab(tabName) {
  // Скрываем все вкладки
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => tab.classList.remove("active"));

  // Убираем активность со всех кнопок
  const buttons = document.querySelectorAll(".tab-button");
  buttons.forEach((button) => button.classList.remove("active"));

  // Показываем выбранную вкладку
  document.getElementById(tabName).classList.add("active");

  // Активируем соответствующую кнопку
  event.target.classList.add("active");
}

// Функции для работы с теорией
function toggleTheory(theoryId) {
  const content = document.getElementById(theoryId);
  const header = content.previousElementSibling;

  if (content.style.display === "none" || content.style.display === "") {
    content.style.display = "block";
    header.style.background = "#218838";

    // Применяем подсветку синтаксиса после открытия секции
    setTimeout(() => {
      highlightCodeInElement(content);
    }, 100);
  } else {
    content.style.display = "none";
    header.style.background = "#28a745";
  }
}

// Функция для подсветки кода в элементе
function highlightCodeInElement(element) {
  // Найдем все блоки .theory-code без pre внутри
  const codeBlocks = element.querySelectorAll(".theory-code");

  codeBlocks.forEach((block) => {
    // Если уже есть pre/code, пропускаем
    if (block.querySelector("pre")) return;

    const content = block.innerHTML.trim();
    // Если содержимое похоже на Go код, оборачиваем его
    if (
      content.includes("func ") ||
      content.includes("var ") ||
      content.includes("package ") ||
      content.includes("import ") ||
      content.includes("//") ||
      content.includes("const ") ||
      content.includes("if ") ||
      content.includes("for ") ||
      content.includes("map[") ||
      content.includes("make(") ||
      content.includes("fmt.") ||
      content.includes(":=")
    ) {
      // Очищаем и форматируем контент
      const cleanContent = content
        .replace(/\s+/g, " ")
        .replace(/\s*\/\/\s*/g, " // ")
        .trim();

      block.innerHTML = `<pre><code class="language-go">${cleanContent}</code></pre>`;
    }
  });

  // Применяем Prism.js
  if (window.Prism) {
    Prism.highlightAllUnder(element);
  }
}

// Инициализация подсветки синтаксиса при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  // Применим подсветку ко всем открытым секциям теории
  const openSections = document.querySelectorAll(
    '.theory-content[style*="block"]'
  );
  openSections.forEach((section) => {
    highlightCodeInElement(section);
  });

  // Также применим к любым видимым блокам кода
  if (window.Prism) {
    Prism.highlightAll();
  }
});

// Функции для работы с задачами на мапы
function checkMapQuiz(quizId, correctAnswer, explanation) {
  const selected = document.querySelector(`input[name="${quizId}"]:checked`);
  const resultDiv = document.getElementById(`result-${quizId}`);

  if (!selected) {
    resultDiv.innerHTML =
      '<div class="quiz-error">❌ Пожалуйста, выберите ответ</div>';
    resultDiv.style.display = "block";
    return;
  }

  const isCorrect = selected.value === correctAnswer;

  // Показываем результат
  resultDiv.style.display = "block";

  if (isCorrect) {
    resultDiv.innerHTML = `<div class="quiz-success">✅ ${explanation}</div>`;
    // Увеличиваем счетчик выполненных задач
    completedTasks++;
    document.getElementById("completedTasks").textContent = completedTasks;
    updateProgress();
    showNotification("Квиз решен правильно! 🎉");
  } else {
    resultDiv.innerHTML =
      '<div class="quiz-error">❌ Неправильно. Попробуйте еще раз!</div>';
  }
}

// Добавляем функцию в глобальную область видимости
window.checkMapQuiz = checkMapQuiz;

// Эталонные решения для проверки кода
const mapCodeSolutions = {
  mapCode1: {
    check: (code) => {
      return (
        code.includes("make(map[string]int)") ||
        (code.includes("map[string]int{") &&
          code.includes('"Алиса"') &&
          code.includes("25"))
      );
    },
    solution: `func CreateAgeMap() map[string]int {
    return map[string]int{
        "Алиса": 25,
        "Боб": 30,
        "Чарли": 35,
    }
}`,
  },
  mapCode2: {
    check: (code) => {
      return code.includes("_, ok := m[key]") && code.includes("return ok");
    },
    solution: `func HasKey(m map[string]int, key string) bool {
    _, ok := m[key]
    return ok
}`,
  },
  mapCode3: {
    check: (code) => {
      return (
        code.includes("range") &&
        code.includes("count") &&
        (code.includes("if") || code.includes("=="))
      );
    },
    solution: `func CountByValue(m map[string]int, value int) int {
    count := 0
    for _, v := range m {
        if v == value {
            count++
        }
    }
    return count
}`,
  },
  mapCode4: {
    check: (code) => {
      return (
        code.includes("make([]string") &&
        code.includes("range") &&
        code.includes("append")
      );
    },
    solution: `func GetKeys(m map[string]int) []string {
    keys := make([]string, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}`,
  },
  mapCode5: {
    check: (code) => {
      return (
        code.includes("make(map[int]string") &&
        code.includes("range") &&
        code.includes("result[")
      );
    },
    solution: `func InvertMap(m map[string]int) map[int]string {
    result := make(map[int]string)
    for k, v := range m {
        result[v] = k
    }
    return result
}`,
  },
  mapCode6: {
    check: (code) => {
      return (
        code.includes("make(map[string]int") &&
        code.includes(">=") &&
        code.includes("range")
      );
    },
    solution: `func FilterByValue(m map[string]int, minValue int) map[string]int {
    result := make(map[string]int)
    for k, v := range m {
        if v >= minValue {
            result[k] = v
        }
    }
    return result
}`,
  },
  mapCode7: {
    check: (code) => {
      return (
        code.includes("make(map[string]int") &&
        code.includes("range") &&
        code.match(/range.*m[12]/)
      );
    },
    solution: `func MergeMaps(m1, m2 map[string]int) map[string]int {
    result := make(map[string]int)
    for k, v := range m1 {
        result[k] = v
    }
    for k, v := range m2 {
        result[k] = v
    }
    return result
}`,
  },
  mapCode8: {
    check: (code) => {
      return (
        code.includes("len(m)") &&
        code.includes("range") &&
        (code.includes("maxValue") || code.includes("max"))
      );
    },
    solution: `func FindMaxKey(m map[string]int) string {
    if len(m) == 0 {
        return ""
    }
    
    var maxKey string
    var maxValue int
    first := true
    
    for k, v := range m {
        if first || v > maxValue {
            maxKey = k
            maxValue = v
            first = false
        }
    }
    return maxKey
}`,
  },
  mapCode9: {
    check: (code) => {
      return (
        code.includes("map[int][]string") &&
        code.includes("len(") &&
        code.includes("append")
      );
    },
    solution: `func GroupByKeyLength(m map[string]int) map[int][]string {
    result := make(map[int][]string)
    for k := range m {
        length := len(k)
        result[length] = append(result[length], k)
    }
    return result
}`,
  },
  mapCode10: {
    check: (code) => {
      return (
        code.includes("map[rune]int") &&
        code.includes("range") &&
        (code.includes("rune(") || code.includes("for _, char"))
      );
    },
    solution: `func CharFrequency(s string) map[rune]int {
    result := make(map[rune]int)
    for _, char := range s {
        result[char]++
    }
    return result
}`,
  },
};

// Функция для проверки кода
function checkMapCode(taskId) {
  const codeInput = document.getElementById(`code-${taskId}`);
  const resultDiv = document.getElementById(`codeResult-${taskId}`);

  if (!codeInput || !resultDiv) {
    console.error(`Элементы не найдены для задачи ${taskId}`);
    return;
  }

  const code = codeInput.value.trim();

  if (!code) {
    resultDiv.innerHTML =
      '<div class="code-error">❌ Пожалуйста, введите код</div>';
    return;
  }

  const solution = mapCodeSolutions[taskId];
  if (!solution) {
    resultDiv.innerHTML =
      '<div class="code-error">❌ Ошибка: решение не найдено</div>';
    return;
  }

  if (solution.check(code)) {
    resultDiv.innerHTML = `
      <div class="code-success">
        ✅ Отлично! Ваше решение выглядит правильным.
        <details style="margin-top: 10px;">
          <summary>Показать эталонное решение</summary>
          <pre style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 5px; white-space: pre-wrap;"><code>${solution.solution}</code></pre>
        </details>
      </div>
    `;
    // Увеличиваем счетчик выполненных задач
    completedTasks++;
    document.getElementById("completedTasks").textContent = completedTasks;
    updateProgress();
    showNotification("Задача решена правильно! 🎉");
  } else {
    resultDiv.innerHTML = `
      <div class="code-error">
        ❌ Решение неполное или содержит ошибки. Проверьте:
        <ul style="margin: 10px 0 0 20px;">
          <li>Правильность синтаксиса Go</li>
          <li>Использование нужных конструкций (range, make, etc.)</li>
          <li>Логику алгоритма</li>
        </ul>
        <details style="margin-top: 10px;">
          <summary>Показать подсказку</summary>
          <pre style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 5px; white-space: pre-wrap;"><code>${solution.solution}</code></pre>
        </details>
      </div>
    `;
  }
}

// Добавляем функции в глобальную область видимости
window.checkMapCode = checkMapCode;
window.mapCodeSolutions = mapCodeSolutions;
