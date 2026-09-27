'use strict';


/* =========================================================
   ELEMENTOS
   ========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const lifeEl = $("life");
const phaseEl = $("phase");
const objectiveEl = $("objective");
const lampEl = $("lamp");

const startScreen = $("startScreen");
const startText = $("startText");
const startBtn = $("startBtn");

const codeScreen = $("codeScreen");
const codeInput = $("codeInput");
const codeBtn = $("codeBtn");
const closeCode = $("closeCode");
const codeResult = $("codeResult");

const flashCode = $("flashCode");
const messageEl = $("message");

const endingScreen = $("endingScreen");
const endingTruth = $("endingTruth");
const endingNewspaper = $("endingNewspaper");
const endingFim = $("endingFim");
const endingNext = $("endingNext");
const endingRestart = $("endingRestart");


/* =========================================================
   MAPA
   ========================================================= */

const MAP = [

  "###############",
  "#.............#",
  "#..###........#",
  "#........###..#",
  "#....#........#",
  "#....#........#",
  "#.............#",
  "#..####....#..#",
  "#.............#",
  "#....#........#",
  "#........###..#",
  "#.............#",
  "#..###........#",
  "#.............#",
  "###############"

];


/* =========================================================
   8 FASES
   ========================================================= */

const phases = [

  {
    name:"ABANDONO",

    code:"6767",

    door:[12.5,13.5],

    key:[9.5,2.5],

    monster:[10.5,7.5],

    speed:.68,

    damage:10,

    objective:"Encontre a chave e ache a porta vermelha."
  },


  {
    name:"OBSERVADOR",

    code:"028732",

    door:[12.5,13.5],

    key:[10.5,2.5],

    monster:[11.5,7.5],

    speed:.86,

    damage:16,

    eyes:true,

    objective:"Pegue a chave. Os olhos aparecem por 0,06s."
  },


  {
    name:"ASSOBIO",

    code:"4192",

    door:[12.5,13.5],

    relic:[3.5,11.5],

    monster:[11.5,6.5],

    speed:.74,

    damage:14,

    hp:3,

    objective:"Encontre a relíquia e use ESPAÇO perto da criatura."
  },


  {
    name:"HOSPITAL",

    code:"73018",

    door:[12.5,13.5],

    fuses:[

      [3.5,5.5],
      [7.5,9.5],
      [11.5,5.5]

    ],

    objective:"Encontre os 3 fusíveis e ative o elevador."
  },


  {
    name:"FLORESTA",

    code:"552941",

    door:[12.5,13.5],

    symbols:[

      [3.5,4.5],
      [9.5,4.5],
      [12.5,10.5]

    ],

    objective:"Encontre os 3 símbolos da floresta."
  },


  {
    name:"METRÔ",

    code:"000000",

    door:[12.5,13.5],

    battery:[3.5,4.5],

    panel:[8.5,7.5],

    train:[12.5,11.5],

    objective:"Pegue a bateria, ative o painel e ligue o trem."
  },


  {
    name:"CASA",

    code:"000000",

    door:[12.5,13.5],

    memories:[

      [3.5,4.5],
      [10.5,4.5],
      [7.5,11.5]

    ],

    objective:"Recupere as 3 memórias."
  },


  {
    name:"VERDADE",

    code:null,

    door:[12.5,13.5],

    objective:"Chegue à última porta."
  }

];


/* =========================================================
   ESTADO
   ========================================================= */

let phase = 1;

let data = phases[0];

let player = {

  x:1.7,
  y:1.7,
  angle:0

};

let monster = null;

let life = 100;

let lampOn = true;

let running = false;

let dead = false;

let doorUnlocked = false;

let keyTaken = false;

let relicTaken = false;

let batteryTaken = false;

let panelActive = false;

let trainReady = false;

let fuses = new Set();

let symbols = new Set();

let memories = new Set();

let damageCooldown = 0;

let attackCooldown = 0;

let messageTimer = 0;

let flashTimer = 0;

let nextFlash = 5;

let eyeTimer = 0;

let nextEye = 6;

let startMode = "new";

const keys = {};

let lastTime = performance.now();


/* =========================================================
   RESIZE
   ========================================================= */

function resize(){

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      1.5
    );

  canvas.width =
    Math.floor(
      innerWidth * dpr
    );

  canvas.height =
    Math.floor(
      innerHeight * dpr
    );

}

window.addEventListener(
  "resize",
  resize
);

resize();


/* =========================================================
   UTILIDADES
   ========================================================= */

function distance(
  ax,
  ay,
  bx,
  by
){

  return Math.hypot(
    ax-bx,
    ay-by
  );

}


function normalizeAngle(a){

  while(
    a > Math.PI
  ){

    a -= Math.PI * 2;

  }

  while(
    a < -Math.PI
  ){

    a += Math.PI * 2;

  }

  return a;

}


function angleDiff(
  a,
  b
){

  return normalizeAngle(a-b);

}


function message(
  text,
  duration=2
){

  messageEl.textContent =
    text;

  messageEl.classList.remove(
    "hidden"
  );

  messageTimer =
    duration;

}


/* =========================================================
   REQUISITOS
   ========================================================= */

function requirementsMet(){

  if(
    phase === 1 ||
    phase === 2
  ){

    return keyTaken;

  }

  if(
    phase === 3
  ){

    return (
      monster &&
      monster.defeated
    );

  }

  if(
    phase === 4
  ){

    return fuses.size === 3;

  }

  if(
    phase === 5
  ){

    return symbols.size === 3;

  }

  if(
    phase === 6
  ){

    return (
      batteryTaken &&
      panelActive &&
      trainReady
    );

  }

  if(
    phase === 7
  ){

    return memories.size === 3;

  }

  return true;

}


/* =========================================================
   HUD
   ========================================================= */

function updateHUD(){

  lifeEl.textContent =
    Math.max(
      0,
      Math.ceil(life)
    );

  phaseEl.textContent =
    `${phase} — ${data.name}`;

  lampEl.textContent =
    lampOn
      ? "LIGADA (C)"
      : "DESLIGADA (C)";


  if(phase === 1){

    objectiveEl.textContent =
      keyTaken
        ? "Chave pega. Vá até a porta vermelha."
        : data.objective;

  }


  else if(phase === 2){

    objectiveEl.textContent =
      keyTaken
        ? "Chave pega. Vá até a porta vermelha."
        : data.objective;

  }


  else if(phase === 3){

    objectiveEl.textContent =

      monster?.defeated

        ? "Criatura derrotada. Vá até a porta."

        : relicTaken

          ? "ESPACO para emitir o pulso."

          : data.objective;

  }


  else if(phase === 4){

    objectiveEl.textContent =
      `Fusíveis: ${fuses.size}/3 — ` +
      (
        requirementsMet()
          ? "Elevador pronto. Vá à porta."
          : data.objective
      );

  }


  else if(phase === 5){

    objectiveEl.textContent =
      `Símbolos: ${symbols.size}/3 — ` +
      (
        requirementsMet()
          ? "Vá até a porta."
          : data.objective
      );

  }


  else if(phase === 6){

    if(!batteryTaken){

      objectiveEl.textContent =
        data.objective;

    }

    else if(!panelActive){

      objectiveEl.textContent =
        "Bateria pega. Vá ao painel e aperte E.";

    }

    else if(!trainReady){

      objectiveEl.textContent =
        "Painel ativo. Vá ao trem e aperte E.";

    }

    else{

      objectiveEl.textContent =
        "Trem ligado. Vá até a porta.";

    }

  }


  else if(phase === 7){

    objectiveEl.textContent =
      `Memórias: ${memories.size}/3 — ` +
      (
        requirementsMet()
          ? "Vá até a última porta."
          : data.objective
      );

  }


  else{

    objectiveEl.textContent =
      data.objective;

  }

}


/* =========================================================
   CARREGAR FASE
   ========================================================= */

function loadPhase(n){

  phase = n;

  data =
    phases[n-1];


  player = {

    x:1.7,
    y:1.7,
    angle:0

  };


  life = 100;

  lampOn = true;

  doorUnlocked = false;

  keyTaken = false;

  relicTaken = false;

  batteryTaken = false;

  panelActive = false;

  trainReady = false;

  fuses = new Set();

  symbols = new Set();

  memories = new Set();


  damageCooldown = 0;

  attackCooldown = 0;


  flashTimer = 0;

  nextFlash =
    4 + Math.random()*4;


  eyeTimer = 0;

  nextEye =
    5.5 + Math.random();


  monster = data.monster

    ? {

        x:data.monster[0],

        y:data.monster[1],

        speed:data.speed,

        damage:data.damage,

        hp:data.hp || 999,

        maxHp:data.hp || 999,

        active:phase < 3,

        defeated:false,

        eyes:!!data.eyes

      }

    : null;


  message(
    `FASE ${phase} — ${data.name}`,
    2.4
  );


  updateHUD();

}


/* =========================================================
   INÍCIO
   ========================================================= */

function startGame(){

  startMode = "new";

  startScreen.classList.add(
    "hidden"
  );

  endingScreen.classList.add(
    "hidden"
  );

  running = true;

  dead = false;

  loadPhase(1);

  lockMouse();

}


function restartPhase(){

  startScreen.classList.add(
    "hidden"
  );

  running = true;

  dead = false;

  loadPhase(phase);

  lockMouse();

}


startBtn.addEventListener(
  "click",
  ()=>{

    if(
      startMode === "phase"
    ){

      restartPhase();

    }
    else{

      startGame();

    }

  }
);


/* =========================================================
   MOUSE
   ========================================================= */

function lockMouse(){

  if(
    canvas.requestPointerLock &&
    document.pointerLockElement !== canvas
  ){

    try{

      canvas.requestPointerLock();

    }catch(_){}

  }

}


canvas.addEventListener(
  "click",
  ()=>{

    if(
      running &&
      !dead
    ){

      lockMouse();

    }

  }
);


window.addEventListener(
  "mousemove",
  event=>{

    if(
      running &&
      !dead &&
      document.pointerLockElement === canvas
    ){

      player.angle +=
        event.movementX * 0.0025;

    }

  }
);


/* =========================================================
   TECLADO
   ========================================================= */

window.addEventListener(
  "keydown",
  event=>{

    const key =
      event.key.toLowerCase();


    keys[key] = true;


    if(
      [
        "w",
        "a",
        "s",
        "d",
        "c",
        "e"
      ].includes(key) ||
      event.code === "Space"
    ){

      event.preventDefault();

    }


    if(
      key === "c" &&
      running &&
      !dead
    ){

      lampOn =
        !lampOn;

      updateHUD();

    }


    if(
      key === "e" &&
      running &&
      !dead
    ){

      interact();

    }


    if(
      event.code === "Space" &&
      running &&
      !dead
    ){

      attack();

    }

  }
);


window.addEventListener(
  "keyup",
  event=>{

    keys[
      event.key.toLowerCase()
    ] = false;

  }
);


window.addEventListener(
  "blur",
  ()=>{

    Object.keys(keys)
      .forEach(
        key=>{
          keys[key] = false;
        }
      );

  }
);


/* =========================================================
   COLISÃO
   ========================================================= */

function wallAt(
  x,
  y
){

  const cellX =
    Math.floor(x);

  const cellY =
    Math.floor(y);


  if(
    cellX < 0 ||
    cellY < 0 ||
    cellX >= MAP[0].length ||
    cellY >= MAP.length
  ){

    return true;

  }


  return (
    MAP[cellY][cellX] === "#"
  );

}


function canMove(
  x,
  y
){

  const r = .22;


  return (

    !wallAt(x-r,y-r) &&
    !wallAt(x+r,y-r) &&
    !wallAt(x-r,y+r) &&
    !wallAt(x+r,y+r)

  );

}


function movePlayer(
  dx,
  dy
){

  if(
    canMove(
      player.x + dx,
      player.y
    )
  ){

    player.x += dx;

  }


  if(
    canMove(
      player.x,
      player.y + dy
    )
  ){

    player.y += dy;

  }

}


/* =========================================================
   MOVIMENTO
   ========================================================= */

function updatePlayer(dt){

  let forward = 0;

  let side = 0;


  if(keys["w"])
    forward++;


  if(keys["s"])
    forward--;


  if(keys["d"])
    side++;


  if(keys["a"])
    side--;


  if(
    !forward &&
    !side
  ){

    return;

  }


  const len =
    Math.hypot(
      forward,
      side
    );


  forward /= len;

  side /= len;


  const speed = 2.7;


  movePlayer(

    (
      Math.cos(player.angle) *
      forward
      -
      Math.sin(player.angle) *
      side
    )
    *
    speed *
    dt,


    (
      Math.sin(player.angle) *
      forward
      +
      Math.cos(player.angle) *
      side
    )
    *
    speed *
    dt

  );

}


/* =========================================================
   COLETAR OBJETOS
   ========================================================= */

function autoCollect(){

  if(
    phase <= 2 &&
    !keyTaken &&
    distance(
      player.x,
      player.y,
      data.key[0],
      data.key[1]
    ) < .6
  ){

    keyTaken = true;

    message(
      "CHAVE ENCONTRADA.",
      1.5
    );

  }


  if(
    phase === 3 &&
    !relicTaken &&
    distance(
      player.x,
      player.y,
      data.relic[0],
      data.relic[1]
    ) < .6
  ){

    relicTaken = true;

    monster.active = true;

    message(
      "RELÍQUIA ENCONTRADA. A criatura acordou.",
      2.2
    );

  }


  if(
    phase === 4
  ){

    data.fuses.forEach(
      (p,i)=>{

        if(
          !fuses.has(i) &&
          distance(
            player.x,
            player.y,
            p[0],
            p[1]
          ) < .6
        ){

          fuses.add(i);

          message(
            `FUSÍVEL ${fuses.size}/3`,
            .9
          );

        }

      }
    );

  }


  if(
    phase === 5
  ){

    data.symbols.forEach(
      (p,i)=>{

        if(
          !symbols.has(i) &&
          distance(
            player.x,
            player.y,
            p[0],
            p[1]
          ) < .6
        ){

          symbols.add(i);

          message(
            `SÍMBOLO ${symbols.size}/3`,
            .9
          );

        }

      }
    );

  }


  if(
    phase === 6 &&
    !batteryTaken &&
    distance(
      player.x,
      player.y,
      data.battery[0],
      data.battery[1]
    ) < .6
  ){

    batteryTaken = true;

    message(
      "BATERIA ENCONTRADA.",
      1.5
    );

  }


  if(
    phase === 7
  ){

    data.memories.forEach(
      (p,i)=>{

        if(
          !memories.has(i) &&
          distance(
            player.x,
            player.y,
            p[0],
            p[1]
          ) < .6
        ){

          memories.add(i);

          message(
            `MEMÓRIA ${memories.size}/3`,
            .9
          );

        }

      }
    );

  }

}


/* =========================================================
   MONSTRO
   ========================================================= */

function updateMonster(dt){

  if(
    !monster ||
    monster.defeated ||
    !monster.active
  ){

    return;

  }


  const dx =
    player.x -
    monster.x;

  const dy =
    player.y -
    monster.y;

  const d =
    Math.hypot(dx,dy);


  if(
    d > .05 &&
    d < 14
  ){

    const step =
      monster.speed *
      dt;


    const vx =
      dx /
      d *
      step;


    const vy =
      dy /
      d *
      step;


    if(
      !wallAt(
        Math.floor(
          monster.x + vx
        ),
        Math.floor(
          monster.y
        )
      )
    ){

      monster.x += vx;

    }


    if(
      !wallAt(
        Math.floor(
          monster.x
        ),
        Math.floor(
          monster.y + vy
        )
      )
    ){

      monster.y += vy;

    }

  }


  /* DANO */

  if(
    damageCooldown <= 0 &&
    d < .7
  ){

    damageCooldown =
      .9;


    life =
      Math.max(
        0,
        life - monster.damage
      );


    if(
      d > .01
    ){

      movePlayer(

        (
          player.x -
          monster.x
        ) /
        d *
        .42,


        (
          player.y -
          monster.y
        ) /
        d *
        .42

      );

    }


    message(
      `A criatura te atingiu! -${monster.damage} VIDA`,
      .8
    );


    if(
      life <= 0
    ){

      playerDied();

    }

  }

}


/* =========================================================
   ATAQUE FASE 3
   ========================================================= */

function attack(){

  if(
    phase !== 3 ||
    !relicTaken ||
    !monster ||
    monster.defeated ||
    attackCooldown > 0
  ){

    return;

  }


  attackCooldown =
    .45;


  const dx =
    monster.x -
    player.x;

  const dy =
    monster.y -
    player.y;


  const d =
    Math.hypot(dx,dy);


  const aim =
    Math.abs(
      angleDiff(
        Math.atan2(
          dy,
          dx
        ),
        player.angle
      )
    );


  if(
    d < 2 &&
    aim < .85
  ){

    monster.hp--;


    if(
      monster.hp > 0
    ){

      message(
        `PULSO ACERTOU — ${monster.hp} RESTANTES.`,
        .8
      );

    }

    else{

      monster.hp = 0;

      monster.defeated = true;

      monster.active = false;

      message(
        "A CRIATURA FOI DERROTADA.",
        2.4
      );

    }

  }

}


/* =========================================================
   INTERAÇÃO
   ========================================================= */

function interact(){

  if(
    !codeScreen.classList.contains(
      "hidden"
    )
  ){

    return;

  }


  /* METRÔ — PAINEL */

  if(
    phase === 6 &&
    batteryTaken &&
    !panelActive &&
    distance(
      player.x,
      player.y,
      data.panel[0],
      data.panel[1]
    ) < 1.1
  ){

    panelActive = true;

    message(
      "PAINEL ATIVADO.",
      1.5
    );

    return;

  }


  /* METRÔ — TREM */

  if(
    phase === 6 &&
    panelActive &&
    !trainReady &&
    distance(
      player.x,
      player.y,
      data.train[0],
      data.train[1]
    ) < 1.1
  ){

    trainReady = true;

    message(
      "TREM ATIVADO.",
      1.5
    );

    return;

  }


  /* PORTA */

  if(
    distance(
      player.x,
      player.y,
      data.door[0],
      data.door[1]
    ) < 1.3
  ){

    if(
      !requirementsMet()
    ){

      if(
        phase === 3
      ){

        message(
          "A porta está selada. Derrote a criatura.",
          2
        );

      }
      else{

        message(
          "A porta ainda não pode ser aberta.",
          1.7
        );

      }

      return;

    }


    /* FINAL */

    if(
      phase === 8
    ){

      showFinale();

      return;

    }


    openCode();

  }

}


/* =========================================================
   CÓDIGO
   ========================================================= */

function openCode(){

  codeScreen.classList.remove(
    "hidden"
  );

  codeInput.value = "";

  codeResult.textContent = "";


  setTimeout(
    ()=>{
      codeInput.focus();
    },
    30
  );


  if(
    document.pointerLockElement === canvas
  ){

    try{

      document.exitPointerLock();

    }
    catch(_){}

  }

}


function closeCodePanel(){

  codeScreen.classList.add(
    "hidden"
  );

  codeInput.blur();

}


closeCode.addEventListener(
  "click",
  closeCodePanel
);


codeScreen.addEventListener(
  "click",
  event=>{

    if(
      event.target === codeScreen
    ){

      closeCodePanel();

    }

  }
);


codeInput.addEventListener(
  "keydown",
  event=>{

    if(
      event.key === "Enter"
    ){

      codeBtn.click();

    }


    if(
      event.key === "Escape"
    ){

      closeCodePanel();

    }

  }
);


codeBtn.addEventListener(
  "click",
  ()=>{

    const entered =
      codeInput.value.trim();


    if(
      entered !== data.code
    ){

      codeResult.textContent =
        "CÓDIGO INCORRETO.";

      return;

    }


    doorUnlocked = true;


    closeCodePanel();


    message(
      "PORTA ABERTA.",
      1.2
    );

  }
);


/* =========================================================
   PASSAR PELA PORTA
   ========================================================= */

function checkDoor(){

  if(
    phase === 8 ||
    !doorUnlocked
  ){

    return;

  }


  if(
    distance(
      player.x,
      player.y,
      data.door[0],
      data.door[1]
    ) < .9
  ){

    loadPhase(
      phase + 1
    );

  }

}


/* =========================================================
   MORTE
   ========================================================= */

function playerDied(){

  running = false;

  dead = true;

  startMode = "phase";


  if(
    document.pointerLockElement === canvas
  ){

    try{

      document.exitPointerLock();

    }
    catch(_){}

  }


  startText.textContent =
    `Você caiu na Fase ${phase}.`;

  startBtn.textContent =
    "REINICIAR FASE";


  startScreen.classList.remove(
    "hidden"
  );

}


/* =========================================================
   CÓDIGOS FLASH
   ========================================================= */

function updateFlash(dt){

  if(
    !data.code
  ){

    return;

  }


  nextFlash -= dt;

  flashTimer =
    Math.max(
      0,
      flashTimer - dt
    );


  if(
    nextFlash <= 0
  ){

    flashCode.textContent =
      data.code;

    flashCode.classList.remove(
      "hidden"
    );


    flashTimer =
      .10;


    nextFlash =
      7 +
      Math.random()*8;

  }


  if(
    flashTimer <= 0
  ){

    flashCode.classList.add(
      "hidden"
    );

  }


  /* OLHOS */

  if(
    data.eyes
  ){

    nextEye -= dt;


    eyeTimer =
      Math.max(
        0,
        eyeTimer - dt
      );


    if(
      nextEye <= 0
    ){

      eyeTimer =
        .06;


      nextEye =
        5.5 +
        Math.random();

    }

  }

}


/* =========================================================
   RAYCAST
   ========================================================= */

function castRay(angle){

  const step =
    .025;

  const max =
    18;


  let x =
    player.x;

  let y =
    player.y;

  let d =
    0;


  const dx =
    Math.cos(angle);

  const dy =
    Math.sin(angle);


  while(
    d < max
  ){

    x +=
      dx * step;

    y +=
      dy * step;

    d +=
      step;


    if(
      wallAt(x,y)
    ){

      return d;

    }

  }


  return max;

}


/* =========================================================
   SPRITES
   ========================================================= */

function spriteList(){

  const list = [];


  if(
    phase <= 2 &&
    !keyTaken
  ){

    list.push([
      "key",
      data.key[0],
      data.key[1]
    ]);

  }


  if(
    phase === 3 &&
    !relicTaken
  ){

    list.push([
      "relic",
      data.relic[0],
      data.relic[1]
    ]);

  }


  if(
    phase === 4
  ){

    data.fuses.forEach(
      (p,i)=>{

        if(
          !fuses.has(i)
        ){

          list.push([
            "fuse",
            p[0],
            p[1]
          ]);

        }

      }
    );

  }


  if(
    phase === 5
  ){

    data.symbols.forEach(
      (p,i)=>{

        if(
          !symbols.has(i)
        ){

          list.push([
            "symbol",
            p[0],
            p[1]
          ]);

        }

      }
    );

  }


  if(
    phase === 6 &&
    !batteryTaken
  ){

    list.push([
      "battery",
      data.battery[0],
      data.battery[1]
    ]);

  }


  if(
    phase === 6 &&
    !panelActive
  ){

    list.push([
      "panel",
      data.panel[0],
      data.panel[1]
    ]);

  }


  if(
    phase === 6 &&
    panelActive &&
    !trainReady
  ){

    list.push([
      "train",
      data.train[0],
      data.train[1]
    ]);

  }


  if(
    phase === 7
  ){

    data.memories.forEach(
      (p,i)=>{

        if(
          !memories.has(i)
        ){

          list.push([
            "memory",
            p[0],
            p[1]
          ]);

        }

      }
    );

  }


  if(
    monster &&
    !monster.defeated
  ){

    list.push([
      "monster",
      monster.x,
      monster.y
    ]);

  }


  if(
    !doorUnlocked ||
    phase === 8
  ){

    list.push([
      "door",
      data.door[0],
      data.door[1]
    ]);

  }


  return list.sort(
    (a,b)=>
      distance(
        player.x,
        player.y,
        b[1],
        b[2]
      )
      -
      distance(
        player.x,
        player.y,
        a[1],
        a[2]
      )
  );

}


/* =========================================================
   DESENHAR PORTA
   ========================================================= */

function drawDoor(
  x,
  size,
  h
){

  const width =
    size * .84;

  const height =
    size * 1.42;

  const top =
    h/2 -
    height/2;


  ctx.save();


  /* brilho */

  const glow =
    ctx.createRadialGradient(
      x,
      h/2,
      4,
      x,
      h/2,
      size*1.35
    );


  glow.addColorStop(
    0,
    "rgba(255,30,30,.55)"
  );

  glow.addColorStop(
    .5,
    "rgba(220,10,10,.20)"
  );

  glow.addColorStop(
    1,
    "rgba(220,0,0,0)"
  );


  ctx.fillStyle =
    glow;


  ctx.fillRect(
    x-size*1.4,
    h/2-size*1.4,
    size*2.8,
    size*2.8
  );


  /* moldura */

  ctx.fillStyle =
    "#701313";


  ctx.fillRect(
    x-width/2-10,
    top-10,
    width+20,
    height+20
  );


  /* porta */

  ctx.fillStyle =
    "#e31c1c";


  ctx.fillRect(
    x-width/2,
    top,
    width,
    height
  );


  /* contorno */

  ctx.strokeStyle =
    "#ff7777";

  ctx.lineWidth =
    Math.max(
      3,
      size*.04
    );


  ctx.strokeRect(
    x-width/2,
    top,
    width,
    height
  );


  /* divisões */

  ctx.strokeStyle =
    "#980909";


  ctx.lineWidth =
    Math.max(
      2,
      size*.02
    );


  ctx.beginPath();


  ctx.moveTo(
    x-width*.28,
    top+height*.13
  );


  ctx.lineTo(
    x-width*.28,
    top+height*.87
  );


  ctx.moveTo(
    x+width*.28,
    top+height*.13
  );


  ctx.lineTo(
    x+width*.28,
    top+height*.87
  );


  ctx.stroke();


  /* maçaneta */

  ctx.fillStyle =
    "#ffd75b";


  ctx.beginPath();


  ctx.arc(
    x+width*.26,
    h/2,
    Math.max(
      4,
      size*.045
    ),
    0,
    Math.PI*2
  );


  ctx.fill();


  /* texto */

  ctx.fillStyle =
    "#fff";


  ctx.textAlign =
    "center";


  ctx.font =
    `bold ${Math.max(13,size*.11)}px Arial`;


  ctx.shadowColor =
    "#000";


  ctx.shadowBlur =
    8;


  ctx.fillText(
    phase === 8
      ? "SAÍDA"
      : "PORTA",
    x,
    top-14
  );


  ctx.restore();

}


/* =========================================================
   DESENHAR OBJETOS
   ========================================================= */

function drawObject(
  x,
  size,
  h,
  color,
  label
){

  const y =
    h/2;

  const radius =
    Math.max(
      6,
      size*.16
    );


  ctx.save();


  ctx.fillStyle =
    color;


  ctx.shadowColor =
    color;


  ctx.shadowBlur =
    Math.max(
      7,
      size*.1
    );


  ctx.beginPath();


  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI*2
  );


  ctx.fill();


  ctx.shadowBlur =
    0;


  ctx.fillStyle =
    "#fff";


  ctx.textAlign =
    "center";


  ctx.font =
    `bold ${Math.max(9,size*.1)}px Arial`;


  ctx.fillText(
    label,
    x,
    y-radius-8
  );


  ctx.restore();

}


/* =========================================================
   DESENHAR MONSTRO
   ========================================================= */

function drawMonster(
  x,
  size,
  h
){

  const mh =
    size*1.34;

  const mw =
    size*.60;

  const top =
    h/2 -
    mh*.55;


  ctx.save();


  ctx.fillStyle =
    phase === 2
      ? "#c8c8c8"
      : "#28282c";


  ctx.beginPath();


  ctx.ellipse(
    x,
    top+mh*.46,
    mw*.5,
    mh*.45,
    0,
    0,
    Math.PI*2
  );


  ctx.fill();


  ctx.fillRect(
    x-mw*.42,
    top+mh*.44,
    mw*.84,
    mh*.50
  );


  let eyes =
    true;


  if(
    monster &&
    monster.eyes
  ){

    eyes =
      eyeTimer > 0;

  }


  if(
    eyes
  ){

    ctx.fillStyle =
      "#fff";


    ctx.fillRect(
      x-mw*.23,
      top+mh*.30,
      Math.max(
        4,
        mw*.12
      ),
      Math.max(
        4,
        mh*.045
      )
    );


    ctx.fillRect(
      x+mw*.11,
      top+mh*.30,
      Math.max(
        4,
        mw*.12
      ),
      Math.max(
        4,
        mh*.045
      )
    );

  }


  /* barra da fase 3 */

  if(
    phase === 3 &&
    relicTaken &&
    monster &&
    !monster.defeated
  ){

    const bw =
      mw*1.25;


    ctx.fillStyle =
      "#111";


    ctx.fillRect(
      x-bw/2,
      top-16,
      bw,
      6
    );


    ctx.fillStyle =
      "#dc4c4c";


    ctx.fillRect(
      x-bw/2,
      top-16,
      bw *
      (
        monster.hp /
        monster.maxHp
      ),
      6
    );

  }


  ctx.restore();

}


/* =========================================================
   DESENHAR SPRITES
   ========================================================= */

function drawSprites(
  depth
){

  const sprites =
    spriteList();


  const fov =
    Math.PI/3;


  for(
    const sprite
    of sprites
  ){

    const type =
      sprite[0];

    const x =
      sprite[1];

    const y =
      sprite[2];


    const dx =
      x-player.x;

    const dy =
      y-player.y;


    const d =
      Math.hypot(
        dx,
        dy
      );


    const rel =
      angleDiff(
        Math.atan2(
          dy,
          dx
        ),
        player.angle
      );


    if(
      Math.abs(rel) >
      fov*.78
    ){

      continue;

    }


    const screenX =
      canvas.width/2 +
      (rel/fov) *
      canvas.width;


    const rayIndex =
      Math.floor(
        (
          screenX /
          canvas.width
        )
        *
        depth.length
      );


    if(
      rayIndex < 0 ||
      rayIndex >= depth.length
    ){

      continue;

    }


    if(
      d >
      depth[rayIndex] +
      .35
    ){

      continue;

    }


    const size =
      Math.max(
        25,
        canvas.height /
        Math.max(
          .6,
          d*1.12
        )
      );


    if(
      type === "door"
    ){

      drawDoor(
        screenX,
        size,
        canvas.height
      );

    }


    else if(
      type === "monster"
    ){

      drawMonster(
        screenX,
        size,
        canvas.height
      );

    }


    else{

      const colors = {

        key:"#ffd84d",
        relic:"#b57cff",
        fuse:"#eeeeee",
        symbol:"#79d27e",
        battery:"#8ba8d3",
        panel:"#55d9ff",
        train:"#c2c2c2",
        memory:"#d7a06a"

      };


      drawObject(
        screenX,
        size,
        canvas.height,
        colors[type],
        type
          .toUpperCase()
          .slice(0,4)
      );

    }

  }

}


/* =========================================================
   RENDER
   ========================================================= */

function render(){

  const width =
    canvas.width;

  const height =
    canvas.height;


  /* fundo */

  ctx.fillStyle =
    "#040406";


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  /* teto */

  const ceiling =
    ctx.createLinearGradient(
      0,
      0,
      0,
      height/2
    );


  ceiling.addColorStop(
    0,
    "#020204"
  );


  ceiling.addColorStop(
    1,
    "#15151a"
  );


  ctx.fillStyle =
    ceiling;


  ctx.fillRect(
    0,
    0,
    width,
    height/2
  );


  /* chão */

  const floor =
    ctx.createLinearGradient(
      0,
      height/2,
      0,
      height
    );


  floor.addColorStop(
    0,
    "#18181d"
  );


  floor.addColorStop(
    1,
    "#020203"
  );


  ctx.fillStyle =
    floor;


  ctx.fillRect(
    0,
    height/2,
    width,
    height/2
  );


  /* paredes */

  const fov =
    Math.PI/3;


  const rays =
    Math.min(
      500,
      Math.max(
        240,
        Math.floor(
          width/3
        )
      )
    );


  const columnWidth =
    width/rays;


  const depth =
    new Array(rays);


  for(
    let i=0;
    i<rays;
    i++
  ){

    const angle =
      player.angle -
      fov/2 +
      fov *
      i /
      (rays-1);


    let d =
      castRay(angle);


    d *=
      Math.cos(
        angle -
        player.angle
      );


    depth[i] =
      d;


    const wallHeight =
      Math.min(
        height*1.8,
        height /
        (
          d*.72
        )
      );


    const y =
      (
        height -
        wallHeight
      ) /
      2;


    let brightness =
      Math.max(
        .08,
        Math.min(
          1,
          1-d/12
        )
      );


    if(
      !lampOn
    ){

      brightness *=
        .42;

    }


    const shade =
      Math.floor(
        20 +
        brightness*105
      );


    ctx.fillStyle =
      `rgb(${shade},${shade},${Math.min(125,shade+8)})`;


    ctx.fillRect(
      i*columnWidth,
      y,
      columnWidth+1,
      wallHeight
    );

  }


  drawSprites(depth);


  /* lanterna desligada */

  if(
    !lampOn
  ){

    const dark =
      ctx.createRadialGradient(
        width/2,
        height/2,
        8,
        width/2,
        height/2,
        Math.max(width,height)*.62
      );


    dark.addColorStop(
      0,
      "rgba(0,0,0,.10)"
    );


    dark.addColorStop(
      1,
      "rgba(0,0,0,.85)"
    );


    ctx.fillStyle =
      dark;


    ctx.fillRect(
      0,
      0,
      width,
      height
    );

  }


  /* mira */

  ctx.strokeStyle =
    "rgba(255,255,255,.65)";

  ctx.lineWidth =
    1;


  ctx.beginPath();


  ctx.moveTo(
    width/2-7,
    height/2
  );


  ctx.lineTo(
    width/2+7,
    height/2
  );


  ctx.moveTo(
    width/2,
    height/2-7
  );


  ctx.lineTo(
    width/2,
    height/2+7
  );


  ctx.stroke();

}


/* =========================================================
   FINAL
   ========================================================= */

function showFinale(){

  running = false;


  if(
    document.pointerLockElement === canvas
  ){

    try{

      document.exitPointerLock();

    }
    catch(_){}

  }


  endingScreen.classList.remove(
    "hidden"
  );


  endingTruth.classList.remove(
    "hidden"
  );


  endingNewspaper.classList.add(
    "hidden"
  );


  endingFim.classList.add(
    "hidden"
  );


  endingScreen.dataset.stage =
    "truth";


  endingNext.textContent =
    "CONTINUAR";

}


endingNext.addEventListener(
  "click",
  ()=>{

    const stage =
      endingScreen.dataset.stage;


    if(
      stage === "truth"
    ){

      endingTruth.classList.add(
        "hidden"
      );

      endingNewspaper.classList.remove(
        "hidden"
      );


      endingScreen.dataset.stage =
        "newspaper";


      endingNext.textContent =
        "VIRAR A ÚLTIMA PÁGINA";

      return;

    }


    if(
      stage === "newspaper"
    ){

      endingNewspaper.classList.add(
        "hidden"
      );

      endingFim.classList.remove(
        "hidden"
      );


      endingScreen.dataset.stage =
        "fim";


      endingNext.textContent =
        "FECHAR";

      return;

    }


    endingScreen.classList.add(
      "hidden"
    );

  }
);


endingRestart.addEventListener(
  "click",
  ()=>{

    endingScreen.classList.add(
      "hidden"
    );

    startGame();

  }
);


/* =========================================================
   UPDATE
   ========================================================= */

function update(dt){

  updatePlayer(dt);

  autoCollect();

  updateMonster(dt);


  damageCooldown =
    Math.max(
      0,
      damageCooldown-dt
    );


  attackCooldown =
    Math.max(
      0,
      attackCooldown-dt
    );


  messageTimer =
    Math.max(
      0,
      messageTimer-dt
    );


  if(
    messageTimer <= 0
  ){

    messageEl.classList.add(
      "hidden"
    );

  }


  updateFlash(dt);

  checkDoor();

  updateHUD();

}


/* =========================================================
   LOOP
   ========================================================= */

function gameLoop(now){

  const dt =
    Math.min(
      .033,
      (
        now-lastTime
      ) / 1000
    );


  lastTime =
    now;


  if(
    running &&
    !dead &&
    codeScreen.classList.contains(
      "hidden"
    )
  ){

    update(dt);

  }


  render();


  requestAnimationFrame(
    gameLoop
  );

}


/* =========================================================
   COMEÇO
   ========================================================= */

loadPhase(1);

updateHUD();

requestAnimationFrame(
  gameLoop
);