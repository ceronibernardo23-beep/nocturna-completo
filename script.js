"use strict";

/* =========================================================
   ELEMENTOS
========================================================= */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const phaseEl = document.getElementById("phase");
const lifeEl = document.getElementById("life");
const objectiveEl = document.getElementById("objective");

const codesBtn = document.getElementById("codesBtn");
const codesPanel = document.getElementById("codesPanel");
const closeCodes = document.getElementById("closeCodes");
const enterCode = document.getElementById("enterCode");
const codeInput = document.getElementById("codeInput");
const codeMessage = document.getElementById("codeMessage");

const doorPanel = document.getElementById("doorPanel");
const doorTitle = document.getElementById("doorTitle");
const doorText = document.getElementById("doorText");
const doorInput = document.getElementById("doorInput");
const doorBtn = document.getElementById("doorBtn");
const doorMessage = document.getElementById("doorMessage");

const screenMessage = document.getElementById("screenMessage");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const restartBtn = document.getElementById("restartBtn");

const startPanel = document.getElementById("startPanel");
const nameInput = document.getElementById("nameInput");
const startBtn = document.getElementById("startBtn");

const choicePanel = document.getElementById("choicePanel");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

const newspaper = document.getElementById("newspaper");
const missingList = document.getElementById("missingList");
const paperFinal = document.getElementById("paperFinal");

const codeFlash = document.getElementById("codeFlash");
const eyeFlash = document.getElementById("eyeFlash");

/* =========================================================
   TECLADO
========================================================= */

const keys = Object.create(null);

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const W = canvas.width;
const H = canvas.height;

const WORLD_WIDTH = 4800;

const GROUND = 500;

const GRAVITY = 1800;

const MAX_HEALTH = 200;

/* RAIO */
const LIGHTNING_DURATION = 0.20;

/* CÓDIGOS DAS PORTAS */

const DOOR_CODES = {
    1: "6767",
    2: "028732",
    3: "4192",
    4: "73018",
    5: "552941",
    6: "000000",
    7: "000000"
};

/* CÓDIGOS QUE PODEM APARECER */

const DISCOVERABLE_CODES = [
    "6767",
    "028732",
    "4192",
    "73018",
    "552941",
    "000000"
];

/* =========================================================
   ESTADO GERAL
========================================================= */

let playerName = "VOCÊ";

let phase = 1;

let gameStarted = false;

let gameOver = false;

let cameraX = 0;

let lastTime = performance.now();

let codeFlashTimer = random(2.5, 6);

let eyeTimer = random(5.5, 6.5);

let temporaryMessage = "";

let temporaryMessageTimer = 0;

let doorOpen = false;

let choiceOpen = false;

let shake = 0;

let phasesCompleted = 0;

/* =========================================================
   PLAYER
========================================================= */

const player = {

    x: 180,

    y: 422,

    width: 38,

    height: 78,

    standingHeight: 78,

    crouchHeight: 42,

    vx: 0,

    vy: 0,

    speed: 270,

    runSpeed: 390,

    jump: 660,

    onGround: true,

    crouching: false,

    facing: 1,

    hp: MAX_HEALTH,

    invuln: 0
};

/* =========================================================
   OBJETOS
========================================================= */

let platforms = [];

let keyItem = null;

let door = null;

let monster = null;

let lightning = null;

let sword = null;

let fuses = [];

let symbols = [];

let battery = null;

let panel = null;

let train = null;

let houseObjects = [];

let memoryDoor = null;

let wallEyes = [];

let phase3Defeated = false;

/* =========================================================
   UTILITÁRIOS
========================================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/* =========================================================
   RESET DO PLAYER
========================================================= */

function resetPlayer(x = 180) {

    player.x = x;

    player.height = player.standingHeight;

    player.y = GROUND - player.height;

    player.vx = 0;

    player.vy = 0;

    player.onGround = true;

    player.crouching = false;

    player.facing = 1;

    player.hp = MAX_HEALTH;

    player.invuln = 0;
}

/* =========================================================
   MENSAGEM
========================================================= */

function showMessage(text, time = 2) {

    temporaryMessage = text;

    temporaryMessageTimer = time;
}

/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    phaseEl.textContent = phase;

    lifeEl.textContent =
        Math.max(
            0,
            Math.floor(player.hp)
        );

    if (temporaryMessageTimer > 0) {

        objectiveEl.textContent =
            temporaryMessage;

        return;
    }

    if (phase === 1) {

        objectiveEl.textContent =
            keyItem?.found
                ? "Abra a porta de madeira."
                : "Encontre a chave.";
    }

    if (phase === 2) {

        objectiveEl.textContent =
            keyItem?.found
                ? "Abra a porta. Não deixe a criatura chegar."
                : "Encontre a chave.";
    }

    if (phase === 3) {

        if (!sword?.found) {

            objectiveEl.textContent =
                "Encontre a espada.";

        } else if (!monster) {

            objectiveEl.textContent =
                "A criatura caiu. Vá até a porta.";

        } else {

            objectiveEl.textContent =
                `Derrote a criatura. Vida: ${monster.life}`;
        }
    }

    if (phase === 4) {

        const found =
            fuses.filter(
                fuse => fuse.found
            ).length;

        objectiveEl.textContent =
            `Encontre os 3 fusíveis (${found}/3).`;
    }

    if (phase === 5) {

        const found =
            symbols.filter(
                symbol => symbol.found
            ).length;

        objectiveEl.textContent =
            `Encontre os 3 símbolos (${found}/3).`;
    }

    if (phase === 6) {

        if (!battery.found) {

            objectiveEl.textContent =
                "Encontre a bateria.";

        } else if (!panel.active) {

            objectiveEl.textContent =
                "Leve a bateria até o painel.";

        } else {

            objectiveEl.textContent =
                "Chegue até o trem.";
        }
    }

    if (phase === 7) {

        const found =
            houseObjects.filter(
                object => object.found
            ).length;

        objectiveEl.textContent =
            `Recupere os 3 objetos (${found}/3).`;
    }

    if (phase === 8) {

        objectiveEl.textContent =
            "Você sabe a verdade. Encontre a última porta.";
    }
}

/* =========================================================
   DANO
========================================================= */

function damage(amount) {

    if (
        gameOver ||
        player.invuln > 0 ||
        doorOpen ||
        choiceOpen
    ) {
        return;
    }

    player.hp -= amount;

    /*
        Pequena invulnerabilidade
        para não tomar vários danos
        no mesmo instante.
    */
    player.invuln = 0.65;

    shake = 8;

    if (player.hp <= 0) {

        player.hp = 0;

        updateHUD();

        endGame(false);

        return;
    }

    updateHUD();
}

/* =========================================================
   PLATAFORMAS
========================================================= */

function landOnPlatforms(previousBottom) {

    if (player.vy < 0) {
        return;
    }

    const currentBottom =
        player.y +
        player.height;

    for (const platform of platforms) {

        const horizontal =
            player.x + player.width >
                platform.x &&
            player.x <
                platform.x + platform.width;

        const crossed =
            previousBottom <= platform.y &&
            currentBottom >= platform.y;

        if (
            horizontal &&
            crossed
        ) {

            player.y =
                platform.y -
                player.height;

            player.vy = 0;

            player.onGround = true;

            return;
        }
    }
}

/* =========================================================
   RESET DO MUNDO
========================================================= */

function resetWorld() {

    platforms = [];

    keyItem = null;

    door = null;

    monster = null;

    lightning = null;

    sword = null;

    fuses = [];

    symbols = [];

    battery = null;

    panel = null;

    train = null;

    houseObjects = [];

    memoryDoor = null;

    wallEyes = [];

    phase3Defeated = false;

    doorOpen = false;

}

/* =========================================================
   COMEÇAR O JOGO
========================================================= */

function startGame() {

    playerName =
        (
            nameInput.value.trim() ||
            "VOCÊ"
        ).slice(0, 24);

    startPanel.classList.add("hidden");

    gameStarted = true;

    createPhase(1);
}

/* =========================================================
   TROCAR DE FASE
========================================================= */

function createPhase(number) {

    phase = number;

    resetWorld();

    cameraX = 0;

    gameOver = false;

    choiceOpen = false;

    if (number === 1) {
        createPhase1();
    }

    if (number === 2) {
        createPhase2();
    }

    if (number === 3) {
        createPhase3();
    }

    if (number === 4) {
        createPhase4();
    }

    if (number === 5) {
        createPhase5();
    }

    if (number === 6) {
        createPhase6();
    }

    if (number === 7) {
        createPhase7();
    }

    if (number === 8) {
        createPhase8();
    }

    updateHUD();
}

/* =========================================================
   PORTA PADRÃO
========================================================= */

function basicDoor(
    x,
    y = 365,
    width = 76,
    height = 135
) {

    return {

        x,

        y,

        width,

        height,

        open: false,

        transition: false
    };
}

/* =========================================================
   FASE 1
========================================================= */

function createPhase1() {

    resetPlayer();

    keyItem = {

        x: 1800,

        y: 480,

        width: 30,

        height: 14,

        found: false
    };

    door =
        basicDoor(3250);

    monster = {

        x: 1200,

        y: 405,

        width: 65,

        height: 95,

        speed: 58
    };

    lightning = {

        active: false,

        timer: 2
    };

    platforms = [

        {
            x: 620,
            y: 455,
            width: 110,
            height: 45
        },

        {
            x: 1020,
            y: 420,
            width: 90,
            height: 80
        },

        {
            x: 1450,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 1720,
            y: 420,
            width: 90,
            height: 80
        },

        {
            x: 2200,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 2620,
            y: 430,
            width: 90,
            height: 70
        },

        {
            x: 2920,
            y: 460,
            width: 140,
            height: 40
        }
    ];
}

/* =========================================================
   FASE 2
========================================================= */

function createPhase2() {

    resetPlayer();

    keyItem = {

        x: 2050,

        y: 480,

        width: 30,

        height: 14,

        found: false
    };

    door =
        basicDoor(
            3550,
            350,
            76,
            150
        );

    monster = {

        x: 900,

        y: 400,

        width: 74,

        height: 100,

        speed: 78
    };

    lightning = {

        active: false,

        timer: 1.6
    };

    platforms = [

        {
            x: 520,
            y: 455,
            width: 100,
            height: 45
        },

        {
            x: 800,
            y: 420,
            width: 90,
            height: 80
        },

        {
            x: 1200,
            y: 455,
            width: 130,
            height: 45
        },

        {
            x: 1500,
            y: 420,
            width: 90,
            height: 80
        },

        {
            x: 1830,
            y: 455,
            width: 110,
            height: 45
        },

        {
            x: 2380,
            y: 430,
            width: 90,
            height: 70
        },

        {
            x: 2750,
            y: 455,
            width: 140,
            height: 45
        },

        {
            x: 3100,
            y: 405,
            width: 85,
            height: 95
        }
    ];

    eyeTimer =
        random(
            5.5,
            6.5
        );
}

/* =========================================================
   FASE 3
========================================================= */

function createPhase3() {

    resetPlayer(220);

    sword = {

        x: 1400,

        y: 430,

        width: 20,

        height: 72,

        found: false
    };

    /*
        CORREÇÃO IMPORTANTE:

        O monstro agora tem:
        hitCooldown = tempo entre golpes
        hitFlash = efeito visual

        Ele NÃO fica intangível.
    */
    monster = {

        x: 3400,

        y: 388,

        width: 92,

        height: 112,

        speed: 52,

        life: 8,

        hitCooldown: 0,

        hitFlash: 0
    };

    door =
        basicDoor(
            4300,
            360,
            76,
            140
        );

    platforms = [

        {
            x: 650,
            y: 420,
            width: 100,
            height: 80
        },

        {
            x: 1050,
            y: 450,
            width: 130,
            height: 50
        },

        {
            x: 1650,
            y: 410,
            width: 100,
            height: 90
        },

        {
            x: 2150,
            y: 440,
            width: 120,
            height: 60
        },

        {
            x: 2580,
            y: 410,
            width: 100,
            height: 90
        },

        {
            x: 3000,
            y: 445,
            width: 140,
            height: 55
        }
    ];
}

/* =========================================================
   FASE 4 — HOSPITAL
========================================================= */

function createPhase4() {

    resetPlayer();

    fuses = [

        {
            x: 900,
            found: false
        },

        {
            x: 1750,
            found: false
        },

        {
            x: 2600,
            found: false
        }
    ];

    door =
        basicDoor(
            3550,
            365,
            76,
            135
        );

    monster = {

        x: 3000,

        y: 405,

        width: 62,

        height: 95,

        speed: 42
    };

    platforms = [

        {
            x: 700,
            y: 455,
            width: 100,
            height: 45
        },

        {
            x: 1120,
            y: 420,
            width: 110,
            height: 80
        },

        {
            x: 1500,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 2050,
            y: 430,
            width: 100,
            height: 70
        },

        {
            x: 2320,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 2950,
            y: 430,
            width: 100,
            height: 70
        }
    ];
}

/* =========================================================
   FASE 5 — FLORESTA
========================================================= */

function createPhase5() {

    resetPlayer();

    symbols = [

        {
            x: 850,
            y: 465,
            found: false,
            id: "△"
        },

        {
            x: 1900,
            y: 465,
            found: false,
            id: "○"
        },

        {
            x: 2850,
            y: 465,
            found: false,
            id: "◇"
        }
    ];

    door =
        basicDoor(
            3900,
            360,
            76,
            140
        );

    monster = {

        x: 3200,

        y: 405,

        width: 60,

        height: 95,

        speed: 38
    };

    platforms = [

        {
            x: 500,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 1300,
            y: 430,
            width: 100,
            height: 70
        },

        {
            x: 2200,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 3100,
            y: 425,
            width: 100,
            height: 75
        }
    ];
}

/* =========================================================
   FASE 6 — METRÔ
========================================================= */

function createPhase6() {

    resetPlayer();

    battery = {

        x: 1100,

        y: 462,

        found: false
    };

    panel = {

        x: 2150,

        y: 440,

        width: 70,

        height: 60,

        active: false
    };

    train = {

        x: 3550,

        y: 395,

        width: 250,

        height: 105,

        ready: false
    };

    door =
        basicDoor(
            4050,
            360,
            76,
            140
        );

    monster = {

        x: 2750,

        y: 405,

        width: 60,

        height: 95,

        speed: 44
    };

    platforms = [

        {
            x: 600,
            y: 460,
            width: 130,
            height: 40
        },

        {
            x: 1450,
            y: 430,
            width: 100,
            height: 70
        },

        {
            x: 1900,
            y: 455,
            width: 130,
            height: 45
        },

        {
            x: 2500,
            y: 430,
            width: 100,
            height: 70
        },

        {
            x: 3200,
            y: 455,
            width: 140,
            height: 45
        }
    ];
}

/* =========================================================
   FASE 7 — CASA
========================================================= */

function createPhase7() {

    resetPlayer();

    houseObjects = [

        {
            x: 850,
            found: false,
            label: "FOTO"
        },

        {
            x: 1850,
            found: false,
            label: "FITA"
        },

        {
            x: 2950,
            found: false,
            label: "CHAVE"
        }
    ];

    door =
        basicDoor(
            3850,
            365,
            76,
            135
        );

    monster = {

        x: 3500,

        y: 405,

        width: 62,

        height: 95,

        speed: 34
    };

    platforms = [

        {
            x: 600,
            y: 450,
            width: 120,
            height: 50
        },

        {
            x: 1200,
            y: 410,
            width: 90,
            height: 90
        },

        {
            x: 1600,
            y: 455,
            width: 120,
            height: 45
        },

        {
            x: 2300,
            y: 420,
            width: 90,
            height: 80
        },

        {
            x: 2600,
            y: 455,
            width: 130,
            height: 45
        },

        {
            x: 3150,
            y: 430,
            width: 100,
            height: 70
        }
    ];
}

/* =========================================================
   FASE 8 — FINAL
========================================================= */

function createPhase8() {

    resetPlayer(250);

    memoryDoor = {

        x: 3950,

        y: 350,

        width: 80,

        height: 150,

        open: false,

        transition: false
    };

    monster = {

        x: 3350,

        y: 395,

        width: 80,

        height: 105,

        speed: 25
    };

    platforms = [

        {
            x: 800,
            y: 430,
            width: 100,
            height: 70
        },

        {
            x: 1500,
            y: 450,
            width: 140,
            height: 50
        },

        {
            x: 2350,
            y: 420,
            width: 110,
            height: 80
        },

        {
            x: 3000,
            y: 450,
            width: 130,
            height: 50
        }
    ];
}

/* =========================================================
   INTERAÇÃO
========================================================= */

function interact() {

    if (
        !gameStarted ||
        gameOver ||
        doorOpen ||
        choiceOpen
    ) {

        return;
    }

    /* ======================
       FASE 1 / 2
    ====================== */

    if (
        phase === 1 ||
        phase === 2
    ) {

        if (
            keyItem &&
            !keyItem.found &&
            Math.abs(
                player.x -
                keyItem.x
            ) < 90
        ) {

            keyItem.found =
                true;

            showMessage(
                "Você encontrou a chave."
            );

            return;
        }

        if (
            door &&
            Math.abs(
                player.x -
                door.x
            ) < 110
        ) {

            if (
                keyItem.found
            ) {

                door.open =
                    true;

                showMessage(
                    "A porta abriu. Entre nela."
                );

            } else {

                showMessage(
                    "A porta está trancada."
                );
            }

            return;
        }
    }

    /* ======================
       FASE 3
    ====================== */

    if (
        phase === 3
    ) {

        if (
            sword &&
            !sword.found &&
            Math.abs(
                player.x -
                sword.x
            ) < 90
        ) {

            sword.found =
                true;

            showMessage(
                "Você encontrou a espada."
            );

            return;
        }

        /*
            Depois de matar a criatura,
            a porta pode ser aberta.
        */

        if (
            phase3Defeated &&
            door &&
            Math.abs(
                player.x -
                door.x
            ) < 110
        ) {

            door.open =
                true;

            showMessage(
                "A porta apareceu."
            );

            return;
        }
    }

    /* ======================
       FASE 4
    ====================== */

    if (
        phase === 4
    ) {

        for (
            const fuse
            of fuses
        ) {

            if (
                !fuse.found &&
                Math.abs(
                    player.x -
                    fuse.x
                ) < 80
            ) {

                fuse.found =
                    true;

                showMessage(
                    "Fusível encontrado."
                );

                return;
            }
        }

        if (
            fuses.every(
                fuse =>
                    fuse.found
            ) &&
            door &&
            Math.abs(
                player.x -
                door.x
            ) < 110
        ) {

            door.open =
                true;

            showMessage(
                "O elevador abriu. Entre."
            );

            return;
        }
    }

    /* ======================
       FASE 5
    ====================== */

    if (
        phase === 5
    ) {

        for (
            const symbol
            of symbols
        ) {

            if (
                !symbol.found &&
                Math.abs(
                    player.x -
                    symbol.x
                ) < 85
            ) {

                symbol.found =
                    true;

                showMessage(
                    `Símbolo ${symbol.id} encontrado.`
                );

                return;
            }
        }

        if (
            symbols.every(
                symbol =>
                    symbol.found
            ) &&
            door &&
            Math.abs(
                player.x -
                door.x
            ) < 130
        ) {

            door.open =
                true;

            showMessage(
                "Os símbolos abriram o portão."
            );

            return;
        }
    }

    /* ======================
       FASE 6
    ====================== */

    if (
        phase === 6
    ) {

        if (
            !battery.found &&
            Math.abs(
                player.x -
                battery.x
            ) < 90
        ) {

            battery.found =
                true;

            showMessage(
                "Você encontrou a bateria."
            );

            return;
        }

        if (
            battery.found &&
            !panel.active &&
            Math.abs(
                player.x -
                panel.x
            ) < 100
        ) {

            panel.active =
                true;

            train.ready =
                true;

            showMessage(
                "Energia restaurada. O trem chegou."
            );

            return;
        }

        if (
            panel.active &&
            Math.abs(
                player.x -
                train.x
            ) < 160
        ) {

            door.open =
                true;

            showMessage(
                "O trem está pronto. Vá até a saída."
            );

            return;
        }
    }

    /* ======================
       FASE 7
    ====================== */

    if (
        phase === 7
    ) {

        for (
            const object
            of houseObjects
        ) {

            if (
                !object.found &&
                Math.abs(
                    player.x -
                    object.x
                ) < 85
            ) {

                object.found =
                    true;

                showMessage(
                    `Você encontrou: ${object.label}.`
                );

                return;
            }
        }

        if (
            houseObjects.every(
                object =>
                    object.found
            ) &&
            door &&
            Math.abs(
                player.x -
                door.x
            ) < 110
        ) {

            door.open =
                true;

            showMessage(
                "A porta finalmente abriu."
            );

            return;
        }
    }

    /* ======================
       FASE 8
    ====================== */

    if (
        phase === 8 &&
        memoryDoor &&
        Math.abs(
            player.x -
            memoryDoor.x
        ) < 120
    ) {

        memoryDoor.open =
            true;

        openChoice();
    }
}

/* =========================================================
   ATAQUE — CORRIGIDO
========================================================= */

function attack() {

    if (
        phase !== 3 ||
        !sword?.found ||
        !monster ||
        gameOver ||
        doorOpen ||
        choiceOpen
    ) {

        return;
    }

    /*
        Esse cooldown NÃO deixa o monstro
        intangível.

        Ele só impede outro golpe por
        0,35 segundo.
    */

    if (
        monster.hitCooldown >
        0
    ) {

        return;
    }

    const distanceToMonster =
        Math.abs(
            player.x -
            monster.x
        );

    if (
        distanceToMonster <=
        160
    ) {

        /*
            DANO
        */

        monster.life -= 1;

        /*
            COOLDOWN ENTRE GOLPES
        */

        monster.hitCooldown =
            0.35;

        /*
            EFEITO VISUAL
        */

        monster.hitFlash =
            0.20;

        shake =
            7;

        showMessage(
            `Você acertou a criatura! Vida: ${Math.max(0, monster.life)}`
        );

        /*
            MORTE DA CRIATURA
        */

        if (
            monster.life <=
            0
        ) {

            monster.life =
                0;

            phase3Defeated =
                true;

            monster =
                null;

            showMessage(
                "A criatura caiu. Vá até a porta.",
                3
            );
        }

        updateHUD();
    }
}

/* =========================================================
   MOVIMENTO
========================================================= */

function movePlayer(dt) {

    if (
        gameOver ||
        doorOpen ||
        choiceOpen ||
        !gameStarted
    ) {

        player.vx =
            0;

        return;
    }

    let direction =
        0;

    if (
        keys["a"] ||
        keys["ArrowLeft"]
    ) {

        direction--;
    }

    if (
        keys["d"] ||
        keys["ArrowRight"]
    ) {

        direction++;
    }

    const crouch =
        keys["s"] ||
        keys["ArrowDown"];

    /* ======================
       AGACHAR
    ====================== */

    if (
        crouch &&
        player.onGround
    ) {

        if (
            !player.crouching
        ) {

            const bottom =
                player.y +
                player.height;

            player.height =
                player.crouchHeight;

            player.y =
                bottom -
                player.height;
        }

        player.crouching =
            true;

    } else {

        if (
            player.crouching
        ) {

            const bottom =
                player.y +
                player.height;

            player.height =
                player.standingHeight;

            player.y =
                bottom -
                player.height;
        }

        player.crouching =
            false;
    }

    /* ======================
       VELOCIDADE
    ====================== */

    let speed =
        keys["Shift"]
            ? player.runSpeed
            : player.speed;

    if (
        player.crouching
    ) {

        speed *=
            0.45;
    }

    player.vx =
        direction *
        speed;

    if (
        direction !== 0
    ) {

        player.facing =
            direction;
    }

    /* ======================
       PULO
    ====================== */

    if (
        (
            keys[" "] ||
            keys["Spacebar"] ||
            keys["ArrowUp"]
        ) &&
        player.onGround &&
        !player.crouching
    ) {

        player.vy =
            -player.jump;

        player.onGround =
            false;
    }

    /* ======================
       FÍSICA
    ====================== */

    const previousBottom =
        player.y +
        player.height;

    player.vy +=
        GRAVITY *
        dt;

    player.x +=
        player.vx *
        dt;

    player.x =
        clamp(
            player.x,
            0,
            WORLD_WIDTH -
                player.width
        );

    player.y +=
        player.vy *
        dt;

    player.onGround =
        false;

    /* ======================
       CHÃO
    ====================== */

    if (
        player.y +
        player.height >=
        GROUND
    ) {

        player.y =
            GROUND -
            player.height;

        player.vy =
            0;

        player.onGround =
            true;
    }

    /* ======================
       PLATAFORMAS
    ====================== */

    landOnPlatforms(
        previousBottom
    );
}

/* =========================================================
   MONSTRO + RAIO
========================================================= */

function updateMonster(dt) {

    if (
        !gameStarted ||
        gameOver ||
        doorOpen ||
        choiceOpen
    ) {

        return;
    }

    /*
        ======================
        FASES 1 E 2
        ======================
    */

    if (
        phase === 1 ||
        phase === 2
    ) {

        if (
            !monster
        ) {

            return;
        }

        /*
            PERSEGUIÇÃO
        */

        if (
            player.x <
            monster.x
        ) {

            monster.x -=
                monster.speed *
                dt;

        } else {

            monster.x +=
                monster.speed *
                dt;
        }

        /*
            DANO DE PROXIMIDADE
        */

        if (
            Math.abs(
                player.x -
                monster.x
            ) < 75
        ) {

            damage(8);
        }

        /*
            RAIO
        */

        if (
            !lightning
        ) {

            return;
        }

        lightning.timer -=
            dt;

        /*
            ATIVA
        */

        if (
            !lightning.active &&
            lightning.timer <= 0
        ) {

            lightning.active =
                true;

            lightning.timer =
                LIGHTNING_DURATION;
        }

        /*
            DESATIVA
        */

        if (
            lightning.active
        ) {

            lightning.timer -=
                dt;

            if (
                lightning.timer <=
                0
            ) {

                lightning.active =
                    false;

                lightning.timer =
                    phase === 1
                        ? random(
                            1.9,
                            2.8
                        )
                        : random(
                            1.6,
                            2.5
                        );
            }
        }

        /*
            HITBOX DO RAIO

            Em pé:
            pode tomar dano.

            Agachado:
            desvia.

            Pulando:
            consegue passar.
        */

        if (
            lightning.active &&
            !player.crouching
        ) {

            const lightningY =
                438;

            const playerTop =
                player.y;

            const playerBottom =
                player.y +
                player.height;

            if (
                playerBottom >
                    lightningY &&
                playerTop <
                    lightningY + 14
            ) {

                damage(12);
            }
        }
    }

    /*
        ======================
        FASE 3
        ======================
    */

    if (
        phase === 3
    ) {

        if (
            !monster
        ) {

            return;
        }

        /*
            CORREÇÃO:

            Atualiza apenas o cooldown
            do golpe.

            NÃO altera a colisão.
        */

        if (
            monster.hitCooldown >
            0
        ) {

            monster.hitCooldown -=
                dt;

            if (
                monster.hitCooldown <
                0
            ) {

                monster.hitCooldown =
                    0;
            }
        }

        /*
            Efeito visual de dano
        */

        if (
            monster.hitFlash >
            0
        ) {

            monster.hitFlash -=
                dt;

            if (
                monster.hitFlash <
                0
            ) {

                monster.hitFlash =
                    0;
            }
        }

        /*
            PERSEGUIÇÃO
        */

        if (
            player.x <
            monster.x
        ) {

            monster.x -=
                monster.speed *
                dt;

        } else {

            monster.x +=
                monster.speed *
                dt;
        }

        /*
            DANO AO ENCOSTAR
        */

        if (
            Math.abs(
                player.x -
                monster.x
            ) < 90
        ) {

            damage(10);
        }
    }

    /*
        ======================
        FASES 4-7
        ======================
    */

    if (
        phase === 4 ||
        phase === 5 ||
        phase === 6 ||
        phase === 7
    ) {

        if (
            !monster
        ) {

            return;
        }

        /*
            Pequeno cooldown simples
            por distância.
        */

        if (
            player.x <
            monster.x
        ) {

            monster.x -=
                monster.speed *
                dt;

        } else {

            monster.x +=
                monster.speed *
                dt;
        }

        if (
            Math.abs(
                player.x -
                monster.x
            ) < 75
        ) {

            damage(8);
        }
    }

    /*
        ======================
        FASE 8
        ======================
    */

    if (
        phase === 8
    ) {

        if (
            !monster
        ) {

            return;
        }

        /*
            A criatura final é lenta.
        */

        if (
            player.x <
            monster.x
        ) {

            monster.x -=
                monster.speed *
                dt;

        } else {

            monster.x +=
                monster.speed *
                dt;
        }

        if (
            Math.abs(
                player.x -
                monster.x
            ) < 90
        ) {

            damage(6);
        }
    }
}

/* =========================================================
   FASE ESPECÍFICA
========================================================= */

function updatePhaseSpecific(dt) {

    if (
        phase === 4 &&
        Math.random() < 0.0015
    ) {

        showMessage(
            "As luzes do hospital piscaram..."
        );
    }

    if (
        phase === 5 &&
        Math.random() < 0.0015
    ) {

        showMessage(
            "Você ouviu passos entre as árvores..."
        );
    }

    if (
        phase === 6 &&
        panel?.active &&
        Math.random() < 0.0015
    ) {

        showMessage(
            "O som do trem ecoa pelo túnel."
        );
    }

    if (
        phase === 7 &&
        Math.random() < 0.0015
    ) {

        showMessage(
            "Uma porta bateu sozinha."
        );
    }

    if (
        phase === 8 &&
        Math.random() < 0.0012
    ) {

        showMessage(
            "Você reconhece esse assobio..."
        );
    }
}

/* =========================================================
   CÓDIGOS PISCANDO
========================================================= */

function flashRandomCode() {

    const code =
        DISCOVERABLE_CODES[
            Math.floor(
                Math.random() *
                DISCOVERABLE_CODES.length
            )
        ];

    codeFlash.textContent =
        code;

    codeFlash.style.opacity =
        "1";

    /*
        0,10 SEGUNDO
    */

    setTimeout(
        () => {

            codeFlash.style.opacity =
                "0";

        },
        100
    );

    codeFlashTimer =
        random(
            3,
            7
        );
}

/* =========================================================
   SISTEMA DE CÓDIGOS
========================================================= */

function updateCodeSystem(dt) {

    if (
        !gameStarted ||
        doorOpen ||
        choiceOpen
    ) {

        return;
    }

    codeFlashTimer -=
        dt;

    if (
        codeFlashTimer <=
        0
    ) {

        if (
            Math.random() <
            0.5
        ) {

            flashRandomCode();

        } else {

            codeFlashTimer =
                random(
                    2,
                    4
                );
        }
    }

    /*
        OLHOS DA FASE 2
    */

    if (
        phase === 2
    ) {

        eyeTimer -=
            dt;

        if (
            eyeTimer <=
            0
        ) {

            eyeFlash.style.opacity =
                "1";

            /*
                0,06 SEGUNDO
            */

            setTimeout(
                () => {

                    eyeFlash.style.opacity =
                        "0";

                },
                60
            );

            eyeTimer =
                random(
                    5.5,
                    6.5
                );
        }
    }
}

/* =========================================================
   CHECAR ENTRADA NA PORTA
========================================================= */

function checkDoorEntry() {

    if (
        gameOver ||
        doorOpen
    ) {

        return;
    }

    const target =
        phase === 8
            ? memoryDoor
            : door;

    if (
        !target ||
        !target.open ||
        target.transition
    ) {

        return;
    }

    const threshold =
        target.x +
        target.width *
        0.35;

    if (
        player.x >
        threshold
    ) {

        target.transition =
            true;

        if (
            phase === 8
        ) {

            openChoice();

        } else {

            openDoorPanel();

        }
    }
}

/* =========================================================
   PAINEL DA PORTA
========================================================= */

function openDoorPanel() {

    doorOpen =
        true;

    doorTitle.textContent =
        "PARABÉNS!";

    const messages = {

        1:
            "Você zerou a primeira parte! Insira o código de porta para que você avance!!!",

        2:
            "Você zerou a segunda parte! Insira o código de porta para que você avance!!!",

        3:
            "Você zerou a terceira parte! A criatura foi derrotada. Insira o código para continuar!!!",

        4:
            "Você zerou a quarta parte! O hospital ficou para trás. Insira o código para continuar!!!",

        5:
            "Você zerou a quinta parte! A floresta ficou em silêncio. Insira o código para continuar!!!",

        6:
            "Você zerou a sexta parte! O metrô ficou para trás. Insira o código para continuar!!!",

        7:
            "Você zerou a sétima parte! A casa finalmente revelou a última passagem!!!"
    };

    doorText.textContent =
        messages[phase];

    doorMessage.textContent =
        "";

    doorInput.value =
        "";

    doorPanel.classList.remove(
        "hidden"
    );

    setTimeout(
        () => {

            doorInput.focus();

        },
        50
    );
}

/* =========================================================
   VERIFICAR CÓDIGO DA PORTA
========================================================= */

function checkDoorCode() {

    const code =
        doorInput.value.trim();

    const correct =
        DOOR_CODES[phase];

    if (
        code === correct
    ) {

        doorMessage.textContent =
            "Código correto.";

        phasesCompleted++;

        const nextPhase =
            phase + 1;

        setTimeout(
            () => {

                doorPanel.classList.add(
                    "hidden"
                );

                doorOpen =
                    false;

                createPhase(
                    nextPhase
                );

            },
            650
        );

    } else {

        doorMessage.textContent =
            "Código incorreto.";
    }
}

/* =========================================================
   ESCOLHA FINAL
========================================================= */

function openChoice() {

    if (
        choiceOpen
    ) {

        return;
    }

    choiceOpen =
        true;

    choicePanel.classList.remove(
        "hidden"
    );
}

/* =========================================================
   JORNAL
========================================================= */

function showNewspaper() {

    choicePanel.classList.add(
        "hidden"
    );

    const names = [

        "Rafael Almeida",

        "Lucas Martins",

        "Mariana Souza",

        "Gabriel Ferreira",

        playerName
    ];

    missingList.innerHTML =
        names
            .map(
                (name, index) => {

                    if (
                        index ===
                        names.length - 1
                    ) {

                        return `
                            <div>
                                <strong>
                                    • ${name}
                                </strong>
                            </div>
                        `;
                    }

                    return `
                        <div>
                            • ${name}
                        </div>
                    `;
                }
            )
            .join("");

    paperFinal.textContent =
        "FIM";

    newspaper.classList.remove(
        "hidden"
    );
}

/* =========================================================
   GAME OVER
========================================================= */

function endGame(win) {

    gameOver =
        true;

    screenMessage.classList.remove(
        "hidden"
    );

    if (
        win
    ) {

        messageTitle.textContent =
            "VOCÊ CHEGOU AO FIM";

        messageText.textContent =
            "Agora você lembra de tudo.";

    } else {

        messageTitle.textContent =
            "VOCÊ MORREU";

        messageText.textContent =
            "A escuridão finalmente te encontrou.";
    }
}

/* =========================================================
   FUNDO
========================================================= */

function drawBackground() {

    let top = "#030303";
    let middle = "#0d0d0d";
    let bottom = "#151515";

    if (
        phase === 2
    ) {

        top = "#080405";
        middle = "#160b0d";
        bottom = "#070707";
    }

    if (
        phase === 3
    ) {

        top = "#020202";
        middle = "#101010";
        bottom = "#080808";
    }

    if (
        phase === 4
    ) {

        top = "#081018";
        middle = "#0d1620";
        bottom = "#070b0f";
    }

    if (
        phase === 5
    ) {

        top = "#031006";
        middle = "#06140a";
        bottom = "#030603";
    }

    if (
        phase === 6
    ) {

        top = "#07090d";
        middle = "#10131b";
        bottom = "#07080b";
    }

    if (
        phase === 7
    ) {

        top = "#100b0b";
        middle = "#171111";
        bottom = "#080606";
    }

    if (
        phase === 8
    ) {

        top = "#030303";
        middle = "#090909";
        bottom = "#020202";
    }

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            H
        );

    gradient.addColorStop(
        0,
        top
    );

    gradient.addColorStop(
        0.65,
        middle
    );

    gradient.addColorStop(
        1,
        bottom
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    if (
        phase === 4
    ) {

        drawHospitalDetails();
    }

    if (
        phase === 5
    ) {

        drawForestDetails();
    }

    if (
        phase === 6
    ) {

        drawMetroDetails();
    }

    if (
        phase === 7
    ) {

        drawHouseDetails();
    }

    if (
        phase === 8
    ) {

        drawFinalDetails();
    }
}

/* =========================================================
   HOSPITAL
========================================================= */

function drawHospitalDetails() {

    ctx.strokeStyle =
        "rgba(180,200,210,.15)";

    ctx.lineWidth =
        2;

    for (
        let x =
            (-cameraX % 180);
        x < W;
        x += 180
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            120
        );

        ctx.lineTo(
            x,
            500
        );

        ctx.stroke();
    }
}

/* =========================================================
   FLORESTA
========================================================= */

function drawForestDetails() {

    for (
        let i = 0;
        i < 28;
        i++
    ) {

        const x =
            (
                i * 210 -
                cameraX * 0.55
            ) % 1400 - 80;

        ctx.fillStyle =
            "#061006";

        ctx.fillRect(
            x,
            300,
            32,
            200
        );

        ctx.beginPath();

        ctx.arc(
            x + 16,
            285,
            70,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

/* =========================================================
   METRÔ
========================================================= */

function drawMetroDetails() {

    ctx.fillStyle =
        "#15171d";

    ctx.fillRect(
        0,
        180,
        W,
        18
    );

    ctx.fillStyle =
        "#0d0e12";

    ctx.fillRect(
        0,
        205,
        W,
        14
    );

    ctx.strokeStyle =
        "#2d3038";

    for (
        let x =
            (-cameraX % 110);
        x < W;
        x += 110
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            220
        );

        ctx.lineTo(
            x,
            500
        );

        ctx.stroke();
    }
}

/* =========================================================
   CASA
========================================================= */

function drawHouseDetails() {

    ctx.strokeStyle =
        "rgba(150,100,80,.18)";

    for (
        let x =
            (-cameraX % 160);
        x < W;
        x += 160
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            150
        );

        ctx.lineTo(
            x,
            500
        );

        ctx.stroke();
    }

    ctx.fillStyle =
        "rgba(255,255,255,.03)";

    ctx.fillRect(
        100,
        180,
        220,
        120
    );
}

/* =========================================================
   FINAL
========================================================= */

function drawFinalDetails() {

    ctx.strokeStyle =
        "#242424";

    for (
        let x =
            (-cameraX % 100);
        x < W;
        x += 100
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            120
        );

        ctx.lineTo(
            x,
            500
        );

        ctx.stroke();
    }

    ctx.fillStyle =
        "rgba(255,255,255,.025)";

    ctx.fillRect(
        430,
        220,
        340,
        150
    );
}

/* =========================================================
   CHÃO
========================================================= */

function drawGround() {

    ctx.fillStyle =
        "#080808";

    ctx.fillRect(
        0,
        GROUND,
        W,
        H - GROUND
    );

    ctx.strokeStyle =
        "#222";

    for (
        let x =
            (-cameraX % 70);
        x < W;
        x += 70
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            GROUND
        );

        ctx.lineTo(
            x + 20,
            H
        );

        ctx.stroke();
    }
}

/* =========================================================
   PLATAFORMAS
========================================================= */

function drawPlatforms() {

    for (
        const platform
        of platforms
    ) {

        const x =
            platform.x -
            cameraX;

        if (
            x +
                platform.width <
                0 ||
            x >
                W
        ) {

            continue;
        }

        ctx.fillStyle =
            "#232323";

        ctx.fillRect(
            x,
            platform.y,
            platform.width,
            platform.height
        );

        ctx.strokeStyle =
            "#444";

        ctx.strokeRect(
            x,
            platform.y,
            platform.width,
            platform.height
        );
    }
}

/* =========================================================
   CHAVE
========================================================= */

function drawKey() {

    if (
        !keyItem ||
        keyItem.found
    ) {

        return;
    }

    const x =
        keyItem.x -
        cameraX;

    ctx.strokeStyle =
        "#ddd";

    ctx.lineWidth =
        5;

    ctx.beginPath();

    ctx.arc(
        x + 7,
        keyItem.y + 8,
        8,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        x + 15,
        keyItem.y + 8
    );

    ctx.lineTo(
        x + 40,
        keyItem.y + 8
    );

    ctx.moveTo(
        x + 29,
        keyItem.y + 8
    );

    ctx.lineTo(
        x + 29,
        keyItem.y + 15
    );

    ctx.stroke();
}

/* =========================================================
   PORTA
========================================================= */

function drawDoor(
    target,
    label = "PORTA"
) {

    if (
        !target
    ) {

        return;
    }

    const x =
        target.x -
        cameraX;

    ctx.fillStyle =
        target.open
            ? "#141414"
            : "#3b281d";

    ctx.fillRect(
        x,
        target.y,
        target.width,
        target.height
    );

    ctx.strokeStyle =
        "#765338";

    ctx.lineWidth =
        4;

    ctx.strokeRect(
        x,
        target.y,
        target.width,
        target.height
    );

    ctx.fillStyle =
        "#b9a080";

    ctx.font =
        "11px Arial";

    ctx.fillText(
        label,
        x + 7,
        target.y - 10
    );
}

/* =========================================================
   ESPADA
========================================================= */

function drawSword() {

    if (
        !sword ||
        sword.found
    ) {

        return;
    }

    const x =
        sword.x -
        cameraX;

    ctx.save();

    ctx.translate(
        x,
        sword.y
    );

    ctx.rotate(
        -0.3
    );

    ctx.fillStyle =
        "#ddd";

    ctx.fillRect(
        0,
        0,
        8,
        60
    );

    ctx.fillStyle =
        "#888";

    ctx.fillRect(
        -6,
        8,
        20,
        6
    );

    ctx.fillStyle =
        "#59351e";

    ctx.fillRect(
        2,
        60,
        5,
        18
    );

    ctx.restore();
}

/* =========================================================
   FUSÍVEIS
========================================================= */

function drawFuses() {

    for (
        const fuse
        of fuses
    ) {

        if (
            fuse.found
        ) {

            continue;
        }

        const x =
            fuse.x -
            cameraX;

        ctx.fillStyle =
            "#d9dde0";

        ctx.fillRect(
            x,
            455,
            18,
            32
        );

        ctx.fillStyle =
            "#40464c";

        ctx.fillRect(
            x + 4,
            460,
            10,
            22
        );
    }
}

/* =========================================================
   SÍMBOLOS
========================================================= */

function drawSymbols() {

    for (
        const symbol
        of symbols
    ) {

        if (
            symbol.found
        ) {

            continue;
        }

        const x =
            symbol.x -
            cameraX;

        ctx.fillStyle =
            "#d5e7cf";

        ctx.font =
            "26px Georgia";

        ctx.fillText(
            symbol.id,
            x,
            symbol.y
        );
    }

    const stoneX =
        3400 -
        cameraX;

    ctx.fillStyle =
        "#2c2c2c";

    ctx.fillRect(
        stoneX,
        445,
        90,
        55
    );

    ctx.strokeStyle =
        "#666";

    ctx.strokeRect(
        stoneX,
        445,
        90,
        55
    );

    ctx.fillStyle =
        "#aaa";

    ctx.font =
        "13px Arial";

    ctx.fillText(
        "RITUAL",
        stoneX + 18,
        475
    );
}

/* =========================================================
   METRÔ
========================================================= */

function drawMetroObjects() {

    if (
        !battery.found
    ) {

        const x =
            battery.x -
            cameraX;

        ctx.fillStyle =
            "#555";

        ctx.fillRect(
            x,
            462,
            28,
            30
        );

        ctx.fillStyle =
            "#ddd";

        ctx.fillRect(
            x + 5,
            455,
            18,
            8
        );
    }

    ctx.fillStyle =
        "#222";

    ctx.fillRect(
        panel.x -
            cameraX,
        panel.y,
        panel.width,
        panel.height
    );

    ctx.strokeStyle =
        panel.active
            ? "#bbb"
            : "#555";

    ctx.strokeRect(
        panel.x -
            cameraX,
        panel.y,
        panel.width,
        panel.height
    );

    ctx.fillStyle =
        panel.active
            ? "#ddd"
            : "#555";

    ctx.fillRect(
        panel.x -
            cameraX +
            20,
        panel.y + 18,
        30,
        10
    );

    ctx.fillStyle =
        train.ready
            ? "#303030"
            : "#111";

    ctx.fillRect(
        train.x -
            cameraX,
        train.y,
        train.width,
        train.height
    );

    ctx.strokeStyle =
        "#555";

    ctx.strokeRect(
        train.x -
            cameraX,
        train.y,
        train.width,
        train.height
    );

    ctx.fillStyle =
        "#aaa";

    ctx.font =
        "12px Arial";

    ctx.fillText(
        train.ready
            ? "TREM"
            : "SEM ENERGIA",
        train.x -
            cameraX +
            50,
        train.y + 30
    );
}

/* =========================================================
   OBJETOS DA CASA
========================================================= */

function drawHouseObjects() {

    for (
        const object
        of houseObjects
    ) {

        if (
            object.found
        ) {

            continue;
        }

        const x =
            object.x -
            cameraX;

        ctx.fillStyle =
            "#b7b1a2";

        ctx.fillRect(
            x,
            455,
            30,
            30
        );

        ctx.fillStyle =
            "#222";

        ctx.font =
            "8px Arial";

        ctx.fillText(
            object.label,
            x - 2,
            497
        );
    }
}

/* =========================================================
   OLHOS NAS PAREDES
========================================================= */

function drawWallEyes() {

    if (
        phase !== 3 &&
        phase !== 5 &&
        phase !== 8
    ) {

        return;
    }

    const count =
        phase === 5
            ? 8
            : phase === 8
                ? 5
                : 5;

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const x =
            (
                i * 420 +
                240 -
                cameraX * 0.5
            ) %
                WORLD_WIDTH;

        const realX =
            x - 50;

        const y =
            phase === 5
                ? 220 +
                    (i % 3) *
                    80
                : 180 +
                    (i % 2) *
                    150;

        if (
            realX <
                -30 ||
            realX >
                W + 30
        ) {

            continue;
        }

        ctx.fillStyle =
            "#ddd";

        ctx.beginPath();

        ctx.ellipse(
            realX,
            y,
            9,
            5,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#111";

        ctx.beginPath();

        ctx.arc(
            realX,
            y,
            2.5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

/* =========================================================
   MONSTRO
========================================================= */

function drawMonster() {

    if (
        !monster
    ) {

        return;
    }

    const x =
        monster.x -
        cameraX;

    const y =
        monster.y;

    ctx.save();

    /*
        AQUI É APENAS EFEITO VISUAL.

        Isso NÃO afeta colisão.

        O monstro continua vulnerável.
    */

    if (
        monster.hitFlash &&
        monster.hitFlash > 0
    ) {

        ctx.globalAlpha =
            0.45;
    }

    /*
        FASE 8
    */

    if (
        phase === 8
    ) {

        ctx.fillStyle =
            "#dedede";

        ctx.fillRect(
            x + 15,
            y + 35,
            50,
            68
        );

        ctx.beginPath();

        ctx.arc(
            x + 40,
            y + 25,
            30,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#111";

        ctx.fillRect(
            x + 2,
            y + 20,
            24,
            5
        );

        ctx.fillRect(
            x + 54,
            y + 20,
            24,
            5
        );

    } else {

        ctx.fillStyle =
            phase === 2
                ? "#bdbdbd"
                : "#282828";

        ctx.fillRect(
            x + 15,
            y + 35,
            42,
            60
        );

        ctx.beginPath();

        ctx.arc(
            x + 36,
            y + 27,
            28,
            0,
            Math.PI * 2
        );

        ctx.fill();

        /*
            OLHOS
        */

        ctx.fillStyle =
            "#080808";

        ctx.beginPath();

        ctx.arc(
            x + 27,
            y + 25,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.arc(
            x + 46,
            y + 25,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        /*
            BOCA
        */

        ctx.beginPath();

        ctx.moveTo(
            x + 17,
            y + 53
        );

        ctx.lineTo(
            x + 56,
            y + 53
        );

        ctx.lineTo(
            x + 47,
            y + 72
        );

        ctx.lineTo(
            x + 27,
            y + 72
        );

        ctx.closePath();

        ctx.fill();
    }

    ctx.restore();
}

/* =========================================================
   RAIO
========================================================= */

function drawLightning() {

    if (
        !lightning ||
        !lightning.active
    ) {

        return;
    }

    ctx.save();

    ctx.strokeStyle =
        "#777";

    ctx.lineWidth =
        7;

    ctx.shadowBlur =
        18;

    ctx.shadowColor =
        "#ddd";

    ctx.beginPath();

    let x =
        0;

    ctx.moveTo(
        0,
        438
    );

    while (
        x < W
    ) {

        x +=
            random(
                25,
                60
            );

        ctx.lineTo(
            x,
            438 +
                random(
                    -10,
                    10
                )
        );
    }

    ctx.stroke();

    ctx.restore();
}

/* =========================================================
   PLAYER
========================================================= */

function drawPlayer() {

    const x =
        player.x -
        cameraX;

    const y =
        player.y;

    ctx.save();

    if (
        player.invuln >
        0
    ) {

        ctx.globalAlpha =
            0.45;
    }

    /*
        CABEÇA
    */

    ctx.fillStyle =
        "#d6d6d6";

    ctx.beginPath();

    ctx.arc(
        x + 19,
        y + 17,
        15,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /*
        CORPO
    */

    ctx.fillStyle =
        "#222";

    ctx.fillRect(
        x + 5,
        y + 31,
        28,
        player.height - 31
    );

    /*
        OLHOS
    */

    ctx.fillStyle =
        "#111";

    ctx.fillRect(
        x + 9,
        y + 14,
        5,
        5
    );

    ctx.fillRect(
        x + 24,
        y + 14,
        5,
        5
    );

    ctx.restore();
}

/* =========================================================
   VINHETA
========================================================= */

function drawVignette() {

    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H / 2,
            100,
            W / 2,
            H / 2,
            720
        );

    gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,.76)"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );
}

/* =========================================================
   OBJETOS
========================================================= */

function drawObjects() {

    if (
        phase === 1 ||
        phase === 2
    ) {

        drawKey();

        drawDoor(
            door
        );
    }

    if (
        phase === 3
    ) {

        drawSword();

        drawWallEyes();

        if (
            phase3Defeated
        ) {

            drawDoor(
                door
            );
        }
    }

    if (
        phase === 4
    ) {

        drawFuses();

        drawDoor(
            door,
            "ELEVADOR"
        );
    }

    if (
        phase === 5
    ) {

        drawSymbols();

        drawWallEyes();

        drawDoor(
            door,
            "PORTÃO"
        );
    }

    if (
        phase === 6
    ) {

        drawMetroObjects();

        drawDoor(
            door,
            "SAÍDA"
        );
    }

    if (
        phase === 7
    ) {

        drawHouseObjects();

        drawDoor(
            door
        );
    }

    if (
        phase === 8
    ) {

        drawWallEyes();

        drawDoor(
            memoryDoor,
            "SAÍDA"
        );
    }
}

/* =========================================================
   UPDATE
========================================================= */

function update(dt) {

    if (
        !gameStarted
    ) {

        return;
    }

    if (
        temporaryMessageTimer >
        0
    ) {

        temporaryMessageTimer -=
            dt;
    }

    if (
        player.invuln >
        0
    ) {

        player.invuln -=
            dt;
    }

    if (
        !gameOver
    ) {

        movePlayer(
            dt
        );

        updateMonster(
            dt
        );

        updateCodeSystem(
            dt
        );

        updatePhaseSpecific(
            dt
        );

        checkDoorEntry();

        /*
            CÂMERA
        */

        cameraX +=
            (
                player.x -
                cameraX -
                W * 0.35
            ) *
            4 *
            dt;

        cameraX =
            clamp(
                cameraX,
                0,
                WORLD_WIDTH -
                    W
            );
    }

    updateHUD();
}

/* =========================================================
   LOOP
========================================================= */

function gameLoop(now) {

    const dt =
        Math.min(
            0.033,
            (
                now -
                lastTime
            ) / 1000
        );

    lastTime =
        now;

    update(
        dt
    );

    drawScene();

    requestAnimationFrame(
        gameLoop
    );
}

/* =========================================================
   CENA
========================================================= */

function drawScene() {

    ctx.clearRect(
        0,
        0,
        W,
        H
    );

    ctx.save();

    /*
        SHAKE
    */

    if (
        shake > 0
    ) {

        ctx.translate(
            random(
                -shake,
                shake
            ),
            random(
                -shake,
                shake
            )
        );

        shake *=
            0.9;
    }

    drawBackground();

    drawGround();

    drawPlatforms();

    drawObjects();

    drawLightning();

    drawMonster();

    drawPlayer();

    drawVignette();

    ctx.restore();
}

/* =========================================================
   EVENTOS
========================================================= */

/*
    COMEÇAR
*/

startBtn.addEventListener(
    "click",
    startGame
);

nameInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            startGame();
        }
    }
);

/*
    CÓDIGOS
*/

codesBtn.addEventListener(
    "click",
    () => {

        if (
            !gameStarted ||
            doorOpen ||
            choiceOpen
        ) {

            return;
        }

        codesPanel.classList.remove(
            "hidden"
        );

        codeInput.focus();
    }
);

closeCodes.addEventListener(
    "click",
    () => {

        codesPanel.classList.add(
            "hidden"
        );
    }
);

enterCode.addEventListener(
    "click",
    () => {

        const code =
            codeInput.value.trim();

        if (
            DISCOVERABLE_CODES.includes(
                code
            )
        ) {

            codeMessage.textContent =
                "Código reconhecido. Você precisa descobrir onde usá-lo.";

        } else {

            codeMessage.textContent =
                "Código desconhecido.";
        }
    }
);

/*
    PORTA
*/

doorBtn.addEventListener(
    "click",
    checkDoorCode
);

doorInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            checkDoorCode();
        }
    }
);

/*
    RECOMEÇAR
*/

restartBtn.addEventListener(
    "click",
    () => {

        screenMessage.classList.add(
            "hidden"
        );

        createPhase(
            1
        );
    }
);

/*
    FINAL
*/

yesBtn.addEventListener(
    "click",
    showNewspaper
);

noBtn.addEventListener(
    "click",
    showNewspaper
);

/* =========================================================
   TECLADO
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        if (
            event.key === " " ||
            event.key === "ArrowUp"
        ) {

            event.preventDefault();
        }

        keys[event.key] =
            true;

        /*
            F
        */

        if (
            event.key.toLowerCase() ===
                "f" &&
            !event.repeat
        ) {

            interact();
        }

        /*
            E
        */

        if (
            event.key.toLowerCase() ===
                "e" &&
            !event.repeat
        ) {

            attack();
        }

        /*
            TAB
        */

        if (
            event.key ===
            "Tab"
        ) {

            event.preventDefault();

            if (
                !gameStarted ||
                doorOpen ||
                choiceOpen
            ) {

                return;
            }

            if (
                codesPanel.classList.contains(
                    "hidden"
                )
            ) {

                codesPanel.classList.remove(
                    "hidden"
                );

                codeInput.focus();

            } else {

                codesPanel.classList.add(
                    "hidden"
                );
            }
        }
    }
);

window.addEventListener(
    "keyup",
    event => {

        keys[event.key] =
            false;
    }
);

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

drawScene();

updateHUD();

requestAnimationFrame(
    gameLoop
);