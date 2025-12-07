const QUESTIONS_PER_SESSION = 50;
const WRONG_KEY = "qc_wrong_questions_v1";

let allQuestions = [];
let mode = "normal";   // "normal" 或 "review"
let wrongSet = new Set();
let currentList = [];
let currentIndex = 0;
let answeredThis = false;
let correctCount = 0;
let answeredCount = 0;

const qTextEl = document.getElementById("question-text");
const feedbackEl = document.getElementById("feedback");
const infoBarEl = document.getElementById("info-bar");
const progressEl = document.getElementById("progress-text");
const nextBtn = document.getElementById("next-btn");
const clearWrongBtn = document.getElementById("clear-wrong");

const modeNormalBtn = document.getElementById("mode-normal");
const modeReviewBtn = document.getElementById("mode-review");
const answerButtons = document.querySelectorAll(".answer-btn");

function loadWrongFromStorage() {
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    wrongSet = new Set(arr);
  } catch (e) {
    console.error("load wrong error", e);
  }
}

function saveWrongToStorage() {
  const arr = Array.from(wrongSet);
  localStorage.setItem(WRONG_KEY, JSON.stringify(arr));
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomQuestions(source, n) {
  if (source.length <= n) return shuffleArray(source);
  const indices = shuffleArray(source.map((_, i) => i)).slice(0, n);
  return indices.map(i => source[i]);
}

function setMode(newMode) {
  mode = newMode;
  modeNormalBtn.className = (mode === "normal") ? "mode-active" : "mode-inactive";
  modeReviewBtn.className = (mode === "review") ? "mode-active" : "mode-inactive";
  resetSession();
}

function resetSession() {
  answeredThis = false;
  answeredCount = 0;
  correctCount = 0;
  feedbackEl.textContent = "";

  if (mode === "normal") {
    currentList = pickRandomQuestions(allQuestions, QUESTIONS_PER_SESSION);
    infoBarEl.textContent = `一般練習模式：本次隨機出題 ${currentList.length} 題。`;
  } else {
    const wrongArray = allQuestions.filter(q => wrongSet.has(String(q.num)));
    if (wrongArray.length === 0) {
      currentList = [];
      infoBarEl.textContent = "錯題複習模式：目前沒有錯題，恭喜！";
    } else {
      currentList = shuffleArray(wrongArray);
      infoBarEl.textContent = `錯題複習模式：目前共有 ${currentList.length} 題錯題。`;
    }
  }

  currentIndex = 0;
  showCurrentQuestion();
}

function showCurrentQuestion() {
  if (!currentList || currentList.length === 0) {
    qTextEl.textContent = "題庫中沒有可出題的題目。";
    feedbackEl.textContent = "";
    progressEl.textContent = "";
    answerButtons.forEach(btn => btn.disabled = true);
    nextBtn.disabled = true;
    return;
  }

  if (currentIndex >= currentList.length) {
    qTextEl.textContent = "本輪題目結束，可以重新開始或切換模式。";
    feedbackEl.innerHTML =
      `本輪作答：${answeredCount} 題，答對 ${correctCount} 題，正確率 ${(answeredCount ? Math.round(correctCount * 100 / answeredCount) : 0)}%。`;
    progressEl.textContent = "";
    answerButtons.forEach(btn => btn.disabled = true);
    nextBtn.disabled = true;
    return;
  }

  const q = currentList[currentIndex];
  qTextEl.textContent = `題號 ${q.num}\n` + q.text;
  feedbackEl.textContent = "";
  progressEl.textContent = `第 ${currentIndex + 1} / ${currentList.length} 題　本輪答對：${correctCount} 題`;
  answeredThis = false;
  answerButtons.forEach(btn => btn.disabled = false);
  nextBtn.disabled = false;
}

function handleAnswer(choice) {
  if (!currentList || currentIndex >= currentList.length) return;
  if (answeredThis) return;

  const q = currentList[currentIndex];
  const correct = q.answer;

  answeredThis = true;
  answeredCount += 1;

  if (choice === correct) {
    correctCount += 1;
    feedbackEl.innerHTML = `<span class="correct">✅ 答對！</span> 正確答案：${correct}`;
    // 在「錯題複習模式」若答對，從錯題清單移除
    if (mode === "review") {
      wrongSet.delete(String(q.num));
      saveWrongToStorage();
    }
  } else {
    feedbackEl.innerHTML = `<span class="wrong">❌ 答錯</span> 正確答案：${correct}，你選的是：${choice}`;
    // 將此題加入錯題清單
    wrongSet.add(String(q.num));
    saveWrongToStorage();
  }

  answerButtons.forEach(btn => btn.disabled = true);
}

function nextQuestion() {
  if (!currentList || currentList.length === 0) return;
  if (!answeredThis && currentIndex < currentList.length) {
    // 如果還沒作答就按下一題，就當作跳過
    feedbackEl.textContent = "（本題未作答，已跳過）";
  }
  currentIndex += 1;
  showCurrentQuestion();
}

// 綁定事件
answerButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const choice = btn.getAttribute("data-choice");
    handleAnswer(choice);
  });
});

nextBtn.addEventListener("click", nextQuestion);

modeNormalBtn.addEventListener("click", () => setMode("normal"));
modeReviewBtn.addEventListener("click", () => setMode("review"));

clearWrongBtn.addEventListener("click", () => {
  if (confirm("確定要清空這支裝置上的錯題記錄嗎？")) {
    wrongSet.clear();
    saveWrongToStorage();
    if (mode === "review") {
      resetSession();
    } else {
      infoBarEl.textContent = "錯題記錄已清空。";
    }
  }
});

// 初始化：載入題庫
async function init() {
  loadWrongFromStorage();
  try {
    const resp = await fetch("questions.json");
    const data = await resp.json();
    allQuestions = data;
    infoBarEl.textContent = `題庫載入成功，共 ${allQuestions.length} 題。`;
    resetSession();
  } catch (e) {
    console.error(e);
    infoBarEl.textContent = "題庫載入失敗，請確認 questions.json 是否存在於同一個資料夾。";
    qTextEl.textContent = "無法載入題目。";
  }
}

init();
