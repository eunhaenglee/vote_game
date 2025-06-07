// ==========================
// 🎇 Kaboom.js Result View with Special Effects + QR Safe
// ==========================
import kaboom from "https://unpkg.com/kaboom@3000.0.0-beta.2/dist/kaboom.mjs";

kaboom({
  background: [14, 29, 47], // Deep navy
  canvas: document.createElement("canvas"),
  root: document.getElementById("kaboom-container"), // QR 코드와 충돌 방지
});

loadSound("pop", "/sounds/pop.mp3");
loadSound("drum", "/sounds/drumroll.mp3");
loadSound("fail", "/sounds/fail.mp3");

const socket = io();

let currentQuestion = "Which do you prefer: A or B?";
let teamScore = { teamA: 0, teamB: 0 };
let resultVisible = false;
let lastResult = { aPercent: 0, bPercent: 0, aCount: 0, bCount: 0 };

const accent = rgb(0, 168, 225);
const colorA = rgb(240, 80, 80);
const colorB = rgb(80, 160, 255);
const textColor = rgb(240, 240, 240);

const questionLabel = add([
  text(currentQuestion, { size: 36, color: accent }),
  pos(center().x, 100),
  anchor("center"),
]);

// 질문 입력 박스
const inputBox = document.createElement("input");
inputBox.type = "text";
inputBox.placeholder = "Type new question and press Enter...";
inputBox.style.position = "absolute";
inputBox.style.top = "20px";
inputBox.style.left = "50%";
inputBox.style.transform = "translateX(-50%)";
inputBox.style.padding = "12px 20px";
inputBox.style.borderRadius = "12px";
inputBox.style.border = "none";
inputBox.style.background = "#1e2a3a";
inputBox.style.color = "#fff";
inputBox.style.fontSize = "16px";
inputBox.style.outline = "none";
inputBox.style.fontFamily = "'Amazon Ember', sans-serif";
document.body.appendChild(inputBox);

inputBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    currentQuestion = inputBox.value;
    questionLabel.text = currentQuestion;
    inputBox.value = "";
  }
});

// 막대그래프 위치
const barY = 160;
const barX = center().x - 300;

let aBar = add([
  rect(0, 36),
  pos(barX, barY),
  color(colorA),
  outline(2, rgb(255, 255, 255)),
  anchor("left"),
]);

let bBar = add([
  rect(0, 36),
  pos(barX, barY),
  color(colorB),
  outline(2, rgb(255, 255, 255)),
  anchor("left"),
]);

let aLabel = add([
  text("A: ?% (?)", { size: 20, color: textColor }),
  pos(barX + 10, barY + 4),
  anchor("left"),
]);

let bLabel = add([
  text("B: ?% (?)", { size: 20, color: textColor }),
  pos(barX + 590, barY + 4),
  anchor("right"),
]);

let scoreLabel = add([
  text("Team A: 0 | Team B: 0", { size: 20, color: textColor }),
  pos(center().x, 240),
  anchor("center"),
]);

function styledButton(label, posX, tag, bgColor = accent) {
  add([
    rect(180, 48, { radius: 10 }),
    pos(posX, 300),
    color(bgColor),
    area(),
    anchor("center"),
    outline(2),
    tag,
  ]);
  add([
    text(label, { size: 20, color: rgb(20, 20, 20) }),
    pos(posX, 300),
    anchor("center"),
  ]);
}

styledButton("Reveal Result", center().x - 120, "revealBtn");
styledButton("Reset Votes", center().x + 120, "resetBtn", rgb(160, 160, 160));

// Reveal 버튼 동작
onClick("revealBtn", () => {
  countdown(() => {
    resultVisible = true;
    updateBars(lastResult.aCount, lastResult.bCount);
    playRevealEffect(lastResult);
  });
});

// Reset 버튼 동작
onClick("resetBtn", () => {
  socket.emit("resetVotes");
  resultVisible = false;
  aLabel.text = "A: ?% (?)";
  bLabel.text = "B: ?% (?)";
  aBar.width = 0;
  bBar.width = 0;
  bBar.pos = vec2(barX, barY);
});

function updateBars(aCount, bCount) {
  const total = aCount + bCount;
  const aRatio = total > 0 ? aCount / total : 0;
  const bRatio = total > 0 ? bCount / total : 0;
  const aPercent = Math.round(aRatio * 100);
  const bPercent = Math.round(bRatio * 100);

  lastResult = { aPercent, bPercent, aCount, bCount };

  if (resultVisible) {
    tween(aBar.width, 600 * aRatio, 0.5, (w) => {
      aBar.width = w;
      bBar.pos = vec2(barX + w, barY);
    });
    tween(bBar.width, 600 * bRatio, 0.5, (w) => {
      bBar.width = w;
    });
    aLabel.text = `A: ${aPercent}% (${aCount})`;
    bLabel.text = `B: ${bPercent}% (${bCount})`;
  }

  if (aCount !== bCount) {
    if (aCount > bCount) teamScore.teamA++;
    else teamScore.teamB++;
  }

  scoreLabel.text = `Team A: ${teamScore.teamA} | Team B: ${teamScore.teamB}`;
}

function countdown(callback) {
  const t = add([
    text("3", { size: 64, color: accent }),
    pos(center()),
    anchor("center"),
    z(20),
  ]);
  play("drum");
  let count = 3;
  const interval = setInterval(() => {
    count--;
    t.text = count > 0 ? count.toString() : "";
    if (count === 0) {
      destroy(t);
      clearInterval(interval);
      callback();
    }
  }, 1000);
}

function playRevealEffect(result) {
  const gap = Math.abs(result.aPercent - result.bPercent);
  const isMatch = gap <= 2;

  let scaleVal = isMatch ? 3 : gap <= 5 ? 2.4 : gap <= 10 ? 1.8 : 1.2;

  if (!isMatch && gap > 40) shake(6);

  const fx = add([
    text(isMatch ? "🎯 50:50 MATCH!" : "Vote Result", {
      size: 32,
      color: isMatch ? accent : rgb(255, 255, 255),
    }),
    pos(center()),
    anchor("center"),
    scale(vec2(0.1)),
    z(10),
  ]);

  tween(vec2(0.1), vec2(scaleVal), 0.5, (v) => fx.scale = vec2(v), easings.easeOutBack);
  wait(2, () => destroy(fx));

  // 배경 깜빡임
  const flash = add([
    rect(width(), height()),
    pos(0, 0),
    color(255, 255, 255),
    opacity(0.1),
    z(0),
  ]);
  tween(0.1, 0, 0.5, (o) => flash.opacity = o);
  wait(0.6, () => destroy(flash));

  // 파티클
  for (let i = 0; i < 80; i++) {
    add([
      rect(rand(3, 6), rand(3, 6)),
      pos(center()),
      color(rand(150, 255), rand(100, 255), rand(100, 255)),
      move(choose([LEFT, RIGHT, UP, DOWN]), rand(200, 600)),
      lifespan(1.2),
      rotate(rand(0, 360)),
    ]);
  }

  play(isMatch ? "pop" : "fail");
}

socket.on("update", ({ A, B }) => {
  updateBars(A, B);
});
