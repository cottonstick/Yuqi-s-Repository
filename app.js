const canvas = document.querySelector("#draw-canvas");
const ctx = canvas.getContext("2d");
const brushColor = document.querySelector("#brush-color");
const brushSize = document.querySelector("#brush-size");
const undoButton = document.querySelector("#undo");
const clearButton = document.querySelector("#clear");
const guessButton = document.querySelector("#guess-button");
const statusText = document.querySelector("#status");
const guessList = document.querySelector("#guess-list");
const apiKeyInput = document.querySelector("#api-key");
const modelInput = document.querySelector("#model");
const nextPromptButton = document.querySelector("#next-prompt");
const currentPrompt = document.querySelector("#current-prompt");
const summaryPrompt = document.querySelector("#summary-prompt");
const customPromptInput = document.querySelector("#custom-prompt");
const setPromptButton = document.querySelector("#set-prompt");
const canvasSizeLabel = document.querySelector("#canvas-size");

const promptPool = [
  "小狗",
  "热气球",
  "机器人",
  "寿司",
  "雨伞",
  "自行车",
  "海豚",
  "相机",
  "生日蛋糕",
  "雪人",
];

const fallbackGuesses = [
  "可能是动物，比如狗或猫",
  "看起来像交通工具或某种机器",
  "也许是食物或甜点",
];

let isDrawing = false;
let lastPoint = { x: 0, y: 0 };
let history = [];
let canvasSize = { width: 0, height: 0, ratio: 1 };

const setStatus = (message) => {
  statusText.textContent = message;
};

const setPrompt = (prompt) => {
  currentPrompt.textContent = prompt;
  summaryPrompt.textContent = prompt;
};

const randomPrompt = () => {
  const index = Math.floor(Math.random() * promptPool.length);
  return promptPool[index];
};

const setupCanvas = () => {
  const ratio = window.devicePixelRatio || 1;
  const { width } = canvas.getBoundingClientRect();
  const height = width * (9 / 16);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvasSize = { width, height, ratio };
  canvasSizeLabel.textContent = `${Math.round(width)} × ${Math.round(height)}`;
  fillBackground();
};

const fillBackground = () => {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.restore();
};

const saveHistory = () => {
  if (history.length >= 15) {
    history.shift();
  }
  history.push(canvas.toDataURL("image/png"));
  undoButton.disabled = history.length <= 1;
};

const restoreFromHistory = () => {
  if (!history.length) {
    return;
  }
  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height);
  };
  image.src = history[history.length - 1];
};

const startDrawing = (event) => {
  isDrawing = true;
  const { x, y } = getCanvasPoint(event);
  lastPoint = { x, y };
};

const draw = (event) => {
  if (!isDrawing) {
    return;
  }
  const { x, y } = getCanvasPoint(event);
  ctx.strokeStyle = brushColor.value;
  ctx.lineWidth = Number(brushSize.value);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastPoint = { x, y };
};

const stopDrawing = () => {
  if (!isDrawing) {
    return;
  }
  isDrawing = false;
  saveHistory();
};

const getCanvasPoint = (event) => {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
};

const clearCanvas = () => {
  fillBackground();
  saveHistory();
  setStatus("画布已清空，开始新的创作吧！");
  guessList.innerHTML = "";
};

const undoCanvas = () => {
  if (history.length <= 1) {
    return;
  }
  history.pop();
  restoreFromHistory();
  undoButton.disabled = history.length <= 1;
  setStatus("已撤销上一步。");
};

const renderGuesses = (items) => {
  guessList.innerHTML = items
    .map((item) => `<li>${item}</li>`)
    .join("");
};

const guessWithFallback = () => {
  setStatus("本地模式：模拟 AI 猜测中...");
  const prompt = currentPrompt.textContent;
  const guesses = fallbackGuesses.map((item) => `${item}（题目：${prompt}）`);
  renderGuesses(guesses);
  setStatus("已完成本地猜测。");
};

const guessWithApi = async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    guessWithFallback();
    return;
  }

  guessButton.disabled = true;
  setStatus("AI 正在分析画作，请稍候...");
  const imageData = canvas.toDataURL("image/png");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelInput.value.trim() || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是你画我猜的 AI 裁判。根据玩家的画作给出 3 个可能答案，并说明最可能的那个。",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `题目供参考：${currentPrompt.textContent}。请按列表格式输出：1. 猜测 2. 猜测 3. 猜测，最后补一句最可能答案。`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("未收到 AI 返回内容");
    }

    const lines = content
      .split("\n")
      .map((line) => line.replace(/^\d+\.?\s*/, "").trim())
      .filter(Boolean);

    renderGuesses(lines.length ? lines : [content]);
    setStatus("AI 已完成猜测！");
  } catch (error) {
    setStatus(`请求失败：${error.message}，已切换为本地猜测。`);
    guessWithFallback();
  } finally {
    guessButton.disabled = false;
  }
};

const handleResize = () => {
  const previous = history[history.length - 1];
  setupCanvas();
  if (previous) {
    history[history.length - 1] = previous;
    restoreFromHistory();
  } else {
    saveHistory();
  }
};

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startDrawing(event);
});

canvas.addEventListener("pointermove", (event) => {
  event.preventDefault();
  draw(event);
});

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

undoButton.addEventListener("click", undoCanvas);
clearButton.addEventListener("click", clearCanvas);
guessButton.addEventListener("click", guessWithApi);

nextPromptButton.addEventListener("click", () => {
  const prompt = randomPrompt();
  setPrompt(prompt);
  setStatus("新题目已生成，开始作画吧！");
});

setPromptButton.addEventListener("click", () => {
  const value = customPromptInput.value.trim();
  if (!value) {
    return;
  }
  setPrompt(value);
  customPromptInput.value = "";
  setStatus("题目已更新。");
});

window.addEventListener("resize", handleResize);

setupCanvas();
saveHistory();
setPrompt(randomPrompt());
setStatus("准备就绪，开始画画吧！");
